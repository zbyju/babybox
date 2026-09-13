# Config UI page

Status: **P0-P5 merged. The feature is done.** The one thing left is the config
history open question below, which was never in scope for P0-P5.
Owner: —
Last updated: 2026-09-13

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
| Write endpoint | `PUT /api/v1/config/main` | safe since P0; the form does not use it |
| Partial write | `PATCH /api/v1/config/main` | P2; what the config page saves with |
| Backend reload | `POST <prefix>/reload` | P4; re-reads the config into the running process |
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
   Cleared in P4 by `POST /reload`, which does that reassignment. It is also what
   makes the binding dangerous: `fetchConfig()` answers a failure with an object
   that has no `data` key, so an unguarded swap leaves `config` undefined and the
   next poll throws. The route checks the shape first and keeps the old config on
   any failure.

## How a saved value actually reaches the running system

There is no single answer, and the UI has to say which case a field is in.

Checked field by field against the code that reads it, 2026-09-13. P3 checked every
row; P4 moved `units.engine.ip`, `units.thermal.ip` and `pc.os` to **Backend reload**
when `POST /reload` shipped. **The live tier is empty** and is not shown. It was listed here before with seven fields,
which was wrong: those fields are read from the pinia config store, and the panel
sets that store once at boot and never again (risk 5). Nothing updates the store
after a save, so a reactive read follows nothing.

Every line number below is the line in this branch, not on `main`: the config page
adds lines to `api/base.ts` and `TheNav.vue`, both of which the table cites.

| Field | Reader | Tier |
|---|---|---|
| `babybox.name` | `panel/components/panel/elements/BabyboxName.vue:16` (const at setup) | Panel reload |
| `backend.url` | `backend/src/index.ts:109` at listen; `panel/src/api/base.ts:20` | Backend restart |
| `backend.port` | `backend/src/index.ts:92` at listen; `panel/src/api/base.ts:20` | Backend restart |
| `backend.requestTimeout` | `panel/src/api/base.ts:21`, `panel/src/logic/panel/tables.ts:74` | Panel reload |
| `configer.url` | `configer/src/index.ts:30` at bind | Configer restart, not writable |
| `configer.port` | `configer/src/index.ts:42` at bind | Configer restart, not writable |
| `configer.requestTimeout` | nothing | No reader |
| `units.engine.ip` | `backend/src/fetch/fetchFromUnits.ts:25,149`, `backend/src/utils/url.ts:37`; `panel/src/components/TheNav.vue:67` | Backend reload |
| `units.thermal.ip` | `backend/src/fetch/fetchFromUnits.ts:25`, `backend/src/utils/url.ts:38`; `panel/src/components/TheNav.vue:73` | Backend reload |
| `units.requestDelay` | `panel/src/logic/panel/panelLoop.ts:295`, `panel/src/logic/panel/state.ts:19` | Panel reload |
| `units.warningThreshold` | `panel/src/logic/panel/state.ts:17` | Panel reload |
| `units.errorThreshold` | `panel/src/logic/panel/state.ts:18` | Panel reload |
| `units.voltage.divider` | `panel/src/utils/panel/conversions.ts:25`, `panel/src/utils/settings/conversions.ts:27` | Panel reload |
| `units.voltage.multiplier` | `panel/src/utils/panel/conversions.ts:25`, `panel/src/utils/settings/conversions.ts:28` | Panel reload |
| `units.voltage.addition` | `panel/src/utils/panel/conversions.ts:26` | Panel reload |
| `camera.ip` | `panel/src/composables/useCamera.ts:72` (captured at mount) | Panel reload |
| `camera.username` | `panel/src/composables/useCamera.ts:71` | Panel reload |
| `camera.password` | `panel/src/composables/useCamera.ts:71` | Panel reload |
| `camera.updateDelay` | `panel/src/composables/useCamera.ts:60` | Panel reload |
| `camera.cameraType` | `panel/src/composables/useCamera.ts:73`, `panel/src/components/panel/elements/CameraView.vue:3` | Panel reload |
| `pc.os` | `backend/src/modules/restart.ts:35,45` | Backend reload |
| `app.password` | `panel/src/components/TheNav.vue:43` | Panel reload |
| `app.refreshRequestLimit` | `panel/src/logic/panel/panelLoop.ts:165` | Panel reload |

The four tiers, and what each one costs the maintainer:

- **Panel reload** — `window.location.reload()`, which the save does on its own.
- **Backend reload** — the save also calls `POST /reload` on the backend, which
  re-reads the config from configer and swaps the exported `config` binding. Live
  as soon as that call comes back. P4.
- **Backend restart** — bound when the server starts listening, so no reload
  reaches it. Someone has to restart the process.
- **Configer restart** — bound when configer starts listening, and the API refuses
  to write it, so it changes only by editing `main.json`.

`units.engine.ip` and `units.thermal.ip` are read on both sides, and both sides are
covered by the save: the backend by `POST /reload`, the panel's nav const array by
the panel reload that follows it.

`backend.port` and `backend.url` stay in the restart tier. `POST /reload` cannot
help there, so instead it reports them: the 200 body carries an `unapplied` list of
what it read but could not put into effect, and the panel turns that into the
banner. The tier is what the form promises before the save; the banner is what the
box actually did.

The panel already reloads itself on `refreshRequestLimit`, so a reload after save is
a path the box is known to survive. That is the plan: **save, reload the backend,
then reload the panel**.

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
- [x] Boot only reads `main.json`, so `main.json.bak` is the config before the last
      write (a `PUT` or a `PATCH`; P2 added the second one)
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

- [x] `PUT /config/main` validates with the shared schema — since P1, through
      `parseMainConfig`. P2 adds the missing branch tests
- [x] Add `PATCH /config/main` for a partial update (the form sends only what changed).
      Merges over the running config, so a key left out keeps its stored value, where
      the same key left out of a `PUT` goes back to the `base.json` default
- [x] ~~`GET /config/schema` returns the form descriptor~~ — decided against, not
      skipped. The panel resolves `@babybox/config-schema` at build time, so the
      endpoint would be a second copy of the shape with no reader today (motto 1).
      See decisions.md, "No `GET /config/schema`"
- [x] Reject a write that would change `configer.port` or `configer.url` out from under
      the running process, or accept it and state clearly that it needs a restart —
      rejected, one field-level 400 per field. Nothing outside configer reads either
      field: the backend and the panel have the address compiled in, so a stored change
      survives the restart and leaves the backend retrying a configer that moved, with
      the box serving nothing. A body that repeats the running values is not a change
      and passes. No `restartRequired` in the response; the apply tier is form metadata
      and lands in P3. See decisions.md
- [x] Tests for each validation branch

Known edge case: a box whose stored `main.json` holds a value the schema rejects (boot
only warns) has every `PATCH` rejected. A bad value of a known field is recoverable
over the API: the error names the field and a `PATCH` that sends a valid value for it
gets through. A key the schema does not know is not: there is no value to send and
`lodash.merge` cannot delete, so only a full `PUT` clears it, because a `PUT` merges
over `base.json`. No bypass, and no stripping of unknown keys — that would delete
what someone put in the file.

Size: ~0.5 day.

### P3 — Panel UI

- [x] Route `/config` in `src/router/index.ts`, lazy-loaded like the others
- [x] Nav entry "Konfigurace" in `TheNav.vue`, `secured: true`
- [x] `views/ConfigView.vue` — same frame as `SettingsView.vue`, including the 10-minute
      bounce back to the panel
- [x] Per field, carry the form metadata alongside the schema: Czech label, widget
      (`text` / `number` / `password` / `select` / `ip`), options, unit suffix, hint,
      apply tier. Moved here from P1. It is `packages/config-schema/src/form.ts`, an
      explicit table keyed by dotted path, with a package test that its paths are
      exactly the leaf paths of `mainConfigSchema`. There is no live tier; see the
      table above
- [x] `api/config.ts` on the panel: `getConfig` only. Moved up from P4, because a form
      with no data cannot be reviewed. `saveConfig` stays in P4
- [x] `components/config/ConfigForm.vue` — renders sections from the schema descriptor
- [x] `components/config/ConfigFormSection.vue` — one card per top-level key
      (babybox, backend, configer, units, camera, pc, app)
- [x] `components/config/ConfigFormField.vue` — picks the widget from the descriptor
- [x] Widgets: reuse `BaseInput` for text/number/password; add `BaseSelect.vue`
      (needed for `camera.cameraType` and `pc.os`); IP validation is a pattern on the
      text widget, and a warning rather than an error, because the schema takes any
      string there and a hostname does reach the unit
- [x] `configer.port` and `configer.url` are rendered read-only: `save()` rejects a
      write to either. `configer.requestTimeout` is rendered with a hint that nothing
      reads it. `startup` gets no row and survives a round trip untouched
- [x] Show the current value, the edited value and the default, per field
- [x] Mark changed fields with `BaseInputState.Accent`, invalid with `.Error` — the
      same states the settings table already uses. A field with a warning shows
      `.Warning`, which wins over `.Accent`; see decisions.md
- [x] Show the apply tier on every field
- [x] Actions row: Save, Discard, Reset to defaults — matching `SettingsFormActions.vue`.
      Save ships disabled with a Czech hint until P4 wires it
- [x] Result and log panes, reusing `SettingsFormResult.vue` and `SettingsFormLog.vue`
      unchanged
- [x] Mask `app.password` and `camera.password` behind a reveal toggle
- [x] Unit tests: the descriptor covers the schema, the changed / unchanged / invalid
      decision per field, the built config including `startup`, discard and reset

Size: ~1.5 days.

### P4 — Applying a change

- [x] ~~`api/config.ts` on the panel: `getConfig`~~ — shipped in P3
- [x] `api/config.ts` on the panel: `saveConfig`, and Save stops being disabled.
      One `PATCH /config/main` carrying the whole parsed config, not a diff: a PUT
      merges over `base.json`, so a stored key the form draws no row for would go
      back to its default, and configer returns early on a body that changes
      nothing. A 400 resolves rather than throws, so its `{ path, msg }` errors land
      on the fields that caused them instead of in one blob in the log
- [x] After a successful save: log it, wait for the response, then `window.location.reload()`
- [x] `POST /reload` on the backend: re-run `fetchConfig()`, reassign the exported
      `config`, return the new values it could not apply (port, prefix). The swap is
      guarded by a hand-written structural check of the five fields the backend
      reads — it cannot run zod, its `dist` is installed outside the workspace. On
      any failure it keeps the config it has and answers 503. See decisions.md
- [x] Panel calls the backend reload before reloading itself
- [x] If the backend reload fails, say so in the log and still reload the panel
- [x] A field in the restart tier shows a persistent "restart required" banner after
      save. The marker goes to `sessionStorage`, because the save ends in a reload
      that wipes every component, and its wording comes from the reload's answer,
      not from the tier. See decisions.md
- [x] Move `units.engine.ip`, `units.thermal.ip` and `pc.os` off the backend-restart
      tier: `POST /reload` applies them, so the old tier is now a promise the box
      does not keep. New `backendReload` tier in `packages/config-schema/src/form.ts`
- [x] Tests: the reload route (success, a `fetchConfig` failure keeping the old
      config, a structurally bad config refused, the unapplied list); the save body;
      the banner for each save outcome; the tier table against the readers

Not in P4, deliberately:

- Seeding the form from the raw body when the stored config fails the schema. P3
  flagged it here; on the code it is not small — `loaded`, `toFormValues`,
  `defaultFormValues`, `formState` and `buildConfig` all take a `MainConfig` today
  and would have to take a draft, and the form would need a rule for a section that
  is missing outright. It is not on this checklist and a half-done repair path is
  worse than none (motto 1). See decisions.md for what reverses it.
- Auth on the write endpoint, confirm dialogs and the component test: those are P5.

Size: ~0.5 day.

### P5 — Guard rails

- [x] Decide on auth for the configer write endpoint — **decided against**, not
      skipped. The suggestion above is circular: `GET /config/main` has no auth and
      returns `app.password`, so whoever can send the header can first read it. Both
      servers also bind every interface and answer `Access-Control-Allow-Origin: *`,
      and the same caller can already open the doors with an unauthenticated
      `GET <prefix>/units/actions/opendoors`. Masking the passwords in `GET` instead
      breaks every box: the panel puts that body into its store, and the nav compares
      the typed password against it, so a sentinel would become the panel password.
      See decisions.md for the evidence and for what reverses it — the real fix is
      binding configer to `127.0.0.1`, in the same phase as the door routes
- [x] Confirm dialog for `app.password`, `backend.port` and both unit IPs.
      `configer.port` is dropped: it is `readOnly`, so `formState` can never report it
      as changed and the dialog could not appear. `backend.url` is added, because it
      strands the panel exactly the way `backend.port` does. It is per-field
      metadata (`confirm` on `FormField`), not a list in the component, and it is one
      dialog for the whole save naming each dangerous field that really changed, with
      its old and new value. A secret is named, never printed. See decisions.md
- [x] Unit tests for the schema, the merge and the diff — already covered by P0-P4 and
      checked field by field before adding anything: the schema in
      `packages/config-schema/src/validate.test.ts` (42 cases), the merge in
      configer's `services/db/main.test.ts` and `routes/configRoute.test.ts`, the diff
      in `formState` / `buildConfig` in `logic/config/__tests__/configForm.test.ts`.
      P5 adds the confirm rule in `__tests__/confirmSave.test.ts` and the `confirm`
      metadata in the package's `form.test.ts`. Nothing was duplicated (motto 1)
- [x] A component test that a bad value blocks Save — **decided against**, and so is
      `@vue/test-utils` for the third time. The rule is already proved on both halves:
      `configForm.test.ts` that a bad value sets `hasErrors`, `saveFlow.test.ts` that
      `hasErrors` makes `runSave` send nothing. A mount would add the one line that
      passes `hasErrors` between them, and cost a lockfile change every box applies
      unattended. See decisions.md for what reverses it
- [x] Update `CLAUDE.md` and `README.md`

Size: ~0.5 day.

Not in P5, deliberately:

- Binding configer to `127.0.0.1`. It closes the config hole completely and costs one
  argument, but it changes the network behaviour of every deployed box on an
  unattended update, and shipped without auth on the backend's action routes it would
  claim a protection the box does not have. Written up in decisions.md.
- Config history and rollback. Still the open question below.

---

## Total

Roughly **4 to 5 focused days** for one developer, of which P0 and P1 are about half
and are useful on their own.

A cut-down version — P0 plus a read-only P3 that shows the config without editing —
is about 1.5 days and removes the whole write-path risk. Worth considering if the real
need is "see what this box is set to" more often than "change it".

## Known constraints

- `pnpm typecheck` on the panel is already red with 20 pre-existing errors, and the
  build's type gate checks zero files. Do not treat a green build as proof. The count
  said 17 until P3 measured it on `origin/main` (1927135); measure it yourself before
  and after, the requirement is no new errors.
- Pin `pnpm@7.5.0`. A newer pnpm rewrites the lockfile format wholesale.
- The panel is on Vue 3.2, Vite 2 and TypeScript 4.7. Pick a select/form approach that
  does not need anything newer.
- All UI text is Czech.

## Open questions

- [x] zod in a shared package, or keep the hand-written guards? zod, decided 2026-09-12,
      see decisions.md
- [x] Should the form edit `configer.*` at all? Answered for two of the three fields in
      P2: `configer.port` and `configer.url` are read-only, because no client follows a
      change and the box is dead after the next restart. `configer.requestTimeout` is
      still editable. See decisions.md, "A write cannot change `configer.port` or
      `configer.url`"
- [ ] **The one thing left.** Do we want a config history — keep the last N versions,
      offer a rollback? The atomic write from P0 makes this nearly free, and it is
      the real answer to "someone typed the wrong IP and now nobody can reach the
      box". P5's confirm dialog asks before that save; it cannot undo it. Not in
      P0-P5 at any point, so it needs a plan of its own.
