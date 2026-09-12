# Config UI page

Status: **P0 merged, P1 in review**
Owner: —
Last updated: 2026-09-12

## Goal

Add a password-protected page in the panel, reachable from the top nav, where a
maintainer edits the whole configer config through a form instead of hand-editing
`source/apps/configer/configs/main.json` over a remote session.

What the form buys us over editing JSON:

- No broken JSON. The file is never hand-written again.
- Per-field types. `camera.cameraType` is a dropdown, `units.engine.ip` is an IP
  field, `units.requestDelay` is a number with a range — not free text.
- Labels, units and hints next to each field, in Czech, like the existing settings table.
- A visible warning for fields that need a restart before they take effect.

## What exists today

| Piece | Where | State |
|---|---|---|
| Config file | `source/apps/configer/configs/main.json` | written by hand |
| Defaults | `source/apps/configer/configs/base.json` | merged over the file on every configer boot |
| Read endpoint | `GET /api/v1/config/main` | works |
| Write endpoint | `PUT /api/v1/config/main` | exists, unused, and unsafe — see Risks |
| Validation | `validateMainConfig` in `@babybox/config-schema` | zod, returns field-level errors |
| Panel config store | `src/pinia/configStore.ts` | set once at boot, never again |
| Panel config types | `src/types/panel/config.types.ts` | derived from the shared type |
| Panel validation | `src/utils/panel/instanceCheck.ts` | the shape the panel reads, warns about the rest |
| Panel defaults | `src/pinia/configStore.ts` | the shared `defaultConfig()` |
| Nav | `src/components/TheNav.vue` | already has a `secured` flag gated on `app.password` |
| Settings page | `src/views/SettingsView.vue` | password-gated, returns to the panel after 10 min |

The shape used to be written out four times, which is where the first two risks come
from. Since P1 it is one zod schema in `source/packages/config-schema`.

## Risks to clear before the UI is worth building

These are the reason this project is not just "add a form".

1. **The validator has a hole that the UI would drive straight through.**
   `MainConfigUnits` in `configer/src/types/main.types.ts` has no `engine` or `thermal`
   field, so the config check never checks the unit IPs. A `PUT` that drops
   them passes validation and is written to disk. The backend then throws on
   `config.units.engine.ip` and the panel shows nothing. `startup` is also missing
   from the check.

2. **`PUT` replaces the whole file.** `mainConfig().update()` does `db.data = c2`.
   There is no merge with `base.json` on write, so anything the client leaves out is
   gone until configer restarts and re-merges the base.

3. **The write has no `fsync` and no backup.** lowdb 3.0.0 writes through steno, which
   already writes a temp file and renames it over `main.json`. What is missing is the
   `fsync` before the rename — without it the rename can land before the data, so a
   power cut can leave `main.json` empty or truncated — plus a backup copy and a boot
   that survives a corrupt file (`JSON.parse` in `JSONFile.read()` throws, so configer
   does not start). Both the backend and the panel refuse to start without a readable
   config, so that is a dead babybox that needs someone on site.

4. **`PUT /config/main` has no auth at all.** Today that is tolerable because nothing
   calls it. Shipping a UI that calls it makes it a reachable way to change the unit
   IPs and the app password from anything on the LAN.

5. **The panel deliberately never re-reads the config.** `panelLoop.ts` sets it once
   and the comment explains why: re-setting it invalidates every config-dependent
   computed mid-flight.

6. **The backend reads the config once at boot** into the exported `config` binding in
   `backend/src/index.ts`. Every consumer (`fetchFromUnits`, `utils/url`,
   `modules/restart`) reads `config.x` inside a function, so reassigning that binding
   does reach them. `backend.port` and `backend.url` are the exception — they are bound
   when the server starts listening and cannot be changed without a restart.

## How a saved value actually reaches the running system

There is no single answer, and the UI has to say which case a field is in.
Three tiers:

| Tier | Applies on | Fields |
|---|---|---|
| **Live** | next poll, no action | `units.requestDelay`, `units.warningThreshold`, `units.errorThreshold`, `units.voltage.*`, `app.password`, `app.refreshRequestLimit`, `babybox.name` |
| **Panel reload** | `window.location.reload()` after save | `camera.*` (captured by `useCamera` at mount), unit IPs in the nav links (a plain const array) |
| **Backend restart** | someone restarts the process | `backend.port`, `backend.url` |

A backend `POST /reload` that re-runs `fetchConfig()` and reassigns `config` covers
the unit IPs and `pc.os` without a restart. Port and prefix stay in the restart tier.

The panel already reloads itself on `refreshRequestLimit`, so a reload after save is
a path the box is known to survive. That is the plan: **save, then reload the panel**.

## Design decision to make first

**Do we add `zod` to configer and the panel, or keep hand-written guards?**

- *With zod*: one schema is the single source of truth for the TS type, the server
  validation, the client validation and the form descriptor. It kills three of the
  four duplicate shape definitions and closes risk 1 by construction. Cost: one small
  dependency in two apps, and the schema has to be reachable from both (a shared
  `source/packages/config-schema`, or a copied file with a test that the two agree).
- *Without zod*: keep `isInstanceOf*`, fix the holes by hand, and write the form
  descriptor as a separate table. Cheaper now, and the shape stays duplicated.

Recommendation: **zod, in a shared package.** The duplication is already producing
bugs, and this feature adds a fifth consumer of the shape. Confidence: medium — the
main unknown is whether a shared workspace package fits the current pnpm/tsc setup
without more work than it saves.

Decided on 2026-09-12: zod 3.23.8 in `source/packages/config-schema`. The
constraints we found on the way are in [decisions.md](../decisions.md), entry
"The config shape is one zod schema in a shared package".

---

## Phases

### P0 — Make writing the config safe (prerequisite)

Nothing in the UI should be built on the current `PUT`.

- [x] Add `engine` and `thermal` to `MainConfigUnits` and to the units check
- [x] Add the `startup` key to the config check
- [x] Merge the incoming body over `base.json` on write, the same way boot does
- [x] Write atomically: write to `main.json.tmp`, `fsync`, then rename over `main.json`
- [x] Keep the previous file as `main.json.bak` before the rename
- [x] On boot, fall back to `main.json.bak` when `main.json` fails to parse, and log it
- [x] Boot only reads `main.json`, so `main.json.bak` is the config before the last PUT
- [x] Reject an empty `PUT` body instead of writing `base.json` over the config
- [x] Return field-level errors from `PUT`, not `JSON.stringify` of the whole body
- [x] Tests: a partial body does not lose keys; a corrupt file boots from the backup;
      the merge base is `base.json`, not the stored config

Size: ~1 day. Worth doing on its own even if the UI is dropped.

### P1 — Shared config schema

- [x] Create `source/packages/config-schema` (zod schema + inferred `MainConfig` type)
- [x] Wire it into the pnpm workspace and both tsconfigs
- [ ] ~~Per field, carry the form metadata alongside the schema~~ — moved to P3, where
      it is first used. Nothing in P1 or P2 reads it (motto 1).
- [x] Delete configer's `main.types.ts` with its local guards; `db/main.ts` imports
      the package
- [x] Point the panel's `config.types.ts` and `instanceCheck.ts` at the shared schema
- [x] Point the backend's `types/config.types.ts` at the shared type. Type only: the
      backend's `dist` is installed standalone, see decisions.md
- [x] Derive `base.json` defaults from the schema, or add a test that they match

Size: ~1 day. This is where most of the value is.

### P2 — Configer write path

- [ ] `PUT /config/main` validates with the shared schema
- [ ] Add `PATCH /config/main` for a partial update (the form sends only what changed)
- [ ] `GET /config/schema` returns the form descriptor, so the panel does not need a
      build-time copy — decide this against just importing the shared package
- [ ] Reject a write that would change `configer.port` or `configer.url` out from under
      the running process, or accept it and state clearly that it needs a restart
- [ ] Tests for each validation branch

Size: ~0.5 day.

### P3 — Panel UI

- [ ] Route `/config` in `src/router/index.ts`, lazy-loaded like the others
- [ ] Nav entry "Konfigurace" in `TheNav.vue`, `secured: true`
- [ ] `views/ConfigView.vue` — same frame as `SettingsView.vue`, including the 10-minute
      bounce back to the panel
- [ ] Per field, carry the form metadata alongside the schema: Czech label, widget
      (`text` / `number` / `password` / `select` / `ip`), options, unit suffix, hint,
      apply tier (live / panel reload / backend restart). Moved here from P1.
- [ ] `components/config/ConfigForm.vue` — renders sections from the schema descriptor
- [ ] `components/config/ConfigFormSection.vue` — one card per top-level key
      (babybox, backend, configer, units, camera, pc, app)
- [ ] `components/config/ConfigFormField.vue` — picks the widget from the descriptor
- [ ] Widgets: reuse `BaseInput` for text/number/password; add `BaseSelect.vue`
      (needed for `camera.cameraType` and `pc.os`); add IP validation as a pattern on
      the text widget rather than a new component
- [ ] Show the current value, the edited value and the default, per field
- [ ] Mark changed fields with `BaseInputState.Accent`, invalid with `.Error` — the
      same states the settings table already uses
- [ ] Show the apply tier on every field that is not live
- [ ] Actions row: Save, Discard, Reset to defaults — matching `SettingsFormActions.vue`
- [ ] Result and log panes, reusing `SettingsFormResult.vue` and `SettingsFormLog.vue`
- [ ] Mask `app.password` and `camera.password` behind a reveal toggle

Size: ~1.5 days.

### P4 — Applying a change

- [ ] `api/config.ts` on the panel: `getConfig`, `saveConfig`
- [ ] After a successful save: log it, wait for the response, then `window.location.reload()`
- [ ] `POST /reload` on the backend: re-run `fetchConfig()`, reassign the exported
      `config`, return the new values it could not apply (port, prefix)
- [ ] Panel calls the backend reload before reloading itself
- [ ] If the backend reload fails, say so in the log and still reload the panel
- [ ] A field in the restart tier shows a persistent "restart required" banner after save

Size: ~0.5 day.

### P5 — Guard rails

- [ ] Decide on auth for the configer write endpoint. Cheapest honest option: require
      the `app.password` as a header, checked server-side. The panel's current password
      gate is client-side only and protects nothing on its own.
- [ ] Confirm dialog for `app.password`, `backend.port`, `configer.port` and both unit IPs
- [ ] Unit tests for the schema, the merge and the diff
- [ ] A component test that a bad value blocks Save
- [ ] Update `CLAUDE.md` and `README.md`

Size: ~0.5 day.

---

## Total

Roughly **4 to 5 focused days** for one developer, of which P0 and P1 are about half
and are useful on their own.

A cut-down version — P0 plus a read-only P3 that shows the config without editing —
is about 1.5 days and removes the whole write-path risk. Worth considering if the real
need is "see what this box is set to" more often than "change it".

## Known constraints

- `pnpm typecheck` on the panel is already red with 17 pre-existing errors, and the
  build's type gate checks zero files. Do not treat a green build as proof.
- Pin `pnpm@7.5.0`. A newer pnpm rewrites the lockfile format wholesale.
- The panel is on Vue 3.2, Vite 2 and TypeScript 4.7. Pick a select/form approach that
  does not need anything newer.
- All UI text is Czech.

## Open questions

- [x] zod in a shared package, or keep the hand-written guards? zod, decided 2026-09-12,
      see decisions.md
- [ ] Should the form edit `configer.*` at all? Changing the port of the service you are
      talking to through that service is a footgun. Read-only is defensible.
- [ ] Do we want a config history — keep the last N versions, offer a rollback? The
      atomic write from P0 makes this nearly free, and it is the real answer to
      "someone typed the wrong IP and now nobody can reach the box".
