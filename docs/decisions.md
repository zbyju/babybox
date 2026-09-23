# Decisions

One entry per decision, newest at the bottom. Keep each short: what we chose, why,
what we gave up. Link the plan or PR where the decision was made.

Format:

```
## YYYY-MM-DD — Title
Context · Decision · Why · Gave up · Where
```

## 2026-09-11 — P0 (safe config write) comes first and does not depend on zod

- Context: [config-ui plan](plans/config-ui.md) has an open question about zod vs
  hand-written guards. P0 is about the write path being safe.
- Decision: do P0 with the existing hand-written guards. Fix the holes by hand.
  Decide zod in P1.
- Why: P0 is useful on its own and must not wait on a dependency decision. It also
  stays small enough to review in one PR.
- Gave up: the guards stay duplicated for now.
- Where: this file, PR "feat: make writing the config safe".

## 2026-09-11 — Config file is written atomically, with one backup

- Context: lowdb 3.0.0 writes `main.json` through steno, which already writes a temp
  file and renames it. What it does not do is `fsync` before the rename, so the rename
  can land before the data and a power cut can leave an empty or truncated file. It
  also keeps no backup, and `JSON.parse` in `JSONFile.read()` throws on a corrupt file,
  so configer does not start. Both backend and panel refuse to start without a config.
- Decision: write to `main.json.tmp`, `fsync`, rename over `main.json`. Before the
  rename, copy the current file to `main.json.bak`. On boot, if `main.json` does not
  parse, load `main.json.bak` and log it. Only a request to the write endpoints
  writes, see "Boot reads main.json and never writes it" below.
- Why: the rename was already atomic; the `fsync` is what makes the renamed file whole.
  One backup covers the failure we actually see. A history with N versions is a later
  decision.
- Gave up: rollback to older versions; a corrupt `.bak` and `.json` at the same time.
- Where: [config-ui plan, P0](plans/config-ui.md).

## 2026-09-11 — Writes merge over base.json, same as boot

- Context: `PUT /config/main` replaced the whole file. Missing keys were lost until
  configer restarted and re-merged `base.json`.
- Decision: on write, merge the incoming body over `base.json` first, then validate,
  then write. Same order as boot.
- Why: one code path for "what is a complete config". A partial body can't delete keys.
- Gave up: nothing.

## 2026-09-11 — Configer tests run with vitest

- Context: configer has no tests. The panel uses vitest, the backend uses jest.
- Decision: vitest, pinned to the same version the panel already has, so the lockfile
  gains no new package versions. Tests live next to the code as `*.test.ts` and are
  excluded from `tsc` so they never land in `dist`.
- Why: configer is ESM (`"type": "module"`); vitest runs TS ESM without extra config.
  Jest would need a transform setup.
- Gave up: one test runner across the monorepo (the backend stays on jest).
- Amended on 2026-09-12: the backend moves to vitest too. See "Backend tests move
  to vitest" below. Configer stays on vitest.

## 2026-09-11 — Work is done by an agent workflow with review on the PR

- Context: the config UI project is done step by step by agents.
- Decision: one Opus agent implements a step and opens a PR. Review agents post
  verified findings as inline PR comments. An Opus agent addresses each thread,
  replies and resolves it. See
  [config-ui-agent-workflow.md](plans/config-ui-agent-workflow.md).
- Why: the PR is the record. Anyone can read what was found and what was done.
- Gave up: speed; a review round adds an hour.

## 2026-09-11 — main.json is read and written with node:fs, not lowdb

- Context: P0 needs an `fsync` before the rename and a backup copy. lowdb's `JSONFile`
  goes through steno, which writes a temp file and renames it but never calls `fsync`
  and keeps no backup, and steno exposes no hook for either. So the write had to be
  ours anyway.
- Decision: drop lowdb for `main.json` and use `node:fs` (open, write, fsync, rename).
  `versions.json` stays on lowdb, it is read-only.
- Why: once the write is ours, lowdb only wraps `readFileSync` and `JSON.parse`. One
  layer fewer to reason about on the path that can kill a box.
- Gave up: nothing. The on-disk format is the same, `JSON.stringify(config, null, 2)`,
  which is exactly what lowdb wrote.
- Where: `source/apps/configer/src/services/db/main.ts`, PR "feat: make writing the
  config safe".

## 2026-09-11 — A corrupt main.json never overwrites main.json.bak

- Context: a box boots from `main.json.bak` because `main.json` does not parse. The
  next PUT backs up the current file before it writes. Without a guard that copies
  the corrupt file over the good backup and loses the only copy.
- Decision: take the backup only when the current `main.json` parses.
- Why: one rule, no flag to pass around, and the backup can only ever hold a file we
  managed to read.
- Where: `write()` in `source/apps/configer/src/services/db/main.ts`.

## 2026-09-11 — An unreadable main.json is kept as main.json.corrupt

- Superseded on 2026-09-12 by "Boot reads main.json and never writes it". Boot no
  longer touches the file, so the broken edit stays in place on its own.

## 2026-09-11 — An empty body is rejected, not treated as "reset to defaults"

- Context: `PUT` now merges the body over `base.json`. `express.json()` sets
  `req.body = {}` for any request whose Content-Type is not JSON, so a `curl -X PUT -d
  @main.json` without the header returned 200 and put the box on defaults.
- Decision: `update()` rejects a body with no keys with `must not be empty` (400).
- Why: no caller needs "reset everything" through an empty body; a real reset sends the
  full default body. The merge-over-base opened this hole, so it closes it.
- Gave up: nothing.
- Where: `update()` in `source/apps/configer/src/services/db/main.ts`.

## 2026-09-11 — The config is written to disk before memory is updated

- Context: `update()` assigned `data` and then called `write()`. If `write` throws,
  memory holds a config that disk does not.
- Decision: `write(merged)` first, then `data = merged`.
- Why: costs nothing, and it stays right once a `try/catch` or error middleware lands.
  Today the unhandled rejection kills the process before anyone reads the stale value,
  which hides the bug rather than fixing it.
- Gave up: nothing.

## 2026-09-12 — Boot reads main.json and never writes it

- Context: boot merged `base.json` over the stored file and wrote the result back.
  The backup copy sat inside the write, so every boot copied the current file over
  `main.json.bak`. A valid but wrong PUT followed by a reboot lost the good config
  from both files. Review finding on the P0 PR.
- Decision: boot merges in memory only. The only writers are the write endpoints, so
  `main.json.bak` is always the config before the last write. `main.json.corrupt` is
  gone. Confirmed on 2026-09-12: nothing outside this repo reads or writes
  `main.json`.
- Amended on 2026-09-13 (P2): `PATCH /config/main` is a second write endpoint, so
  "before the last PUT" is now "before the last write". The decision itself stands:
  boot still never writes, and both endpoints go through one `save()`. A save that
  changes nothing does not write at all, so it does not rotate the backup either.
- Why: one backup that means one thing, and a reboot can no longer destroy it.
- Gave up: after a boot `main.json` on disk shows only the keys someone typed, not
  the full merged shape. `GET /config/main` and `base.json` still show the full
  shape. A fresh box has no `main.json` until the first write.
- Where: `mainConfig()` in `source/apps/configer/src/services/db/main.ts`.

## 2026-09-12 — The camera type list is the panel's list, matched exactly

- Context: the plan asked for a union of the camera types the rest of the system
  supports. The backend does not read `cameraType` at all; the panel does, in
  `apps/panel/src/utils/panel/camera.ts`, where it lower-cases the value and looks
  for a known name inside it. An earlier version of this PR matched the panel's rule
  and accepted any case and any extra text, which left the TS type and the stored
  value apart.
- Decision: the allowed list is `dahua`, `hikvision`, `avtech`, `avm`, `vivotek`, and
  the check is an exact match, the same as `pc.os`.
- Why: every deployed box holds one of these exact lower-case values, confirmed
  2026-09-12. With an exact match the TS type, the check and the stored value are
  one thing, and nothing ever has to rewrite what a maintainer typed.
- Gave up: the panel is wider than the check. `Dahua IPC` works in the panel but a
  PUT with it gets a 400. No deployed file has such a value.
- Where: `cameraTypes` in `source/packages/config-schema/src/schema.ts`.

## 2026-09-12 — The config shape is one zod schema in a shared package

- Context: the config shape was written five times: configer's types and validator,
  the backend's types, the panel's types, guards and defaults. They already disagreed:
  `cameraType` is a union in one and a `string` in two, the panel's default voltage
  divider is 3400 where `base.json` says 63, and the panel has an `app.version` that
  nothing sets. The [config-ui plan](plans/config-ui.md) left zod versus hand-written
  guards open until P0 was merged.
- Decision: one zod schema in `source/packages/config-schema`
  (`@babybox/config-schema`). `MainConfig` is `z.infer` of it. Configer and the panel
  validate with it, the backend imports the type only. zod pinned to `3.23.8`.
- Why: one source for the type, the validation, the defaults and, in P3, the form
  descriptor. `3.23.8` is the last 3.x before zod started shipping v4 next to v3
  (3.25), and it runs on TypeScript 4.7, which all three apps use; zod 4 needs 5.5.
- Constraints found on the way, each of them shapes the package:
  1. The package is ESM and built with `tsc` to `dist/`. Configer runs the built JS on
     Node 18, which cannot load `.ts`, so every consumer resolves `main` and `types`
     from `dist/` and the package is built first: root `build` and `dev` scripts, CI.
  2. The backend imports the type only, through a tsconfig `paths` entry and
     `import type`, and lists the package nowhere in its `package.json`. Why it
     cannot: learnings.md, Startup.
- Gave up: a hand-written validator we already had and understood; about 60 KB of zod
  in the panel bundle; one more build step in every box's update path. The form
  metadata moved from P1 to P3, where it is first read.
- Where: [config-ui plan, P1](plans/config-ui.md), PR "feat: share one config schema
  across the apps".

## 2026-09-12 — The panel accepts a config with a key it does not know

- Superseded the same day by "The panel checks the shape it reads, not the whole
  schema". Unknown keys were only the smallest part of what a stored config can get
  wrong, and the rest stopped the panel just as hard.

## 2026-09-12 — defaultConfig is a function, not a constant

- Context: the package exports the defaults that base.json holds on disk. The panel
  puts them straight into a pinia store, which is reactive and mutable.
- Decision: `defaultConfig()` builds a fresh object on every call.
- Why: a shared constant that one store mutates changes what every later caller reads,
  and nothing in the type system stops it. The cost is one object per call, at boot.
- Gave up: nothing.
- Where: `source/packages/config-schema/src/defaults.ts`.

## 2026-09-12 — The panel checks the shape it reads, not the whole schema

- Context: the panel's guard was the shared schema with unknown keys forgiven. Every
  other rule then applied to a file no write path had ever checked — configer only
  warns about a bad stored value and serves it. A `refreshRequestLimit` of 0 (the only
  way to turn the reload off), a delay of 0, a `pc.os` the panel never reads: each one
  kept `AppState` short of `Ok`, so `MainView` never mounted, the loop never started
  and the engine watchdog never ran. A box that blocks itself (motto 3). Review
  finding on the P1 PR.
- Decision: the panel's guard is structural. The five sections it reads must be there
  and be objects, and each field it reads must be a string where it reads a string and
  a number where it reads a number. No ranges, no name lists; `refreshRequestLimit`
  may be missing or null. `isInstanceOfConfig` first logs the full
  `validateMainConfig` result with `console.warn`, so a maintainer still sees the bad
  value. `PUT /config/main` keeps every rule.
- Why: rejecting is a write-path job. The read path only needs the shape it reads.
- The check lives in the panel, not in the package: the field list is the panel's, not
  the file's, and the package should not have to know which sections a consumer reads.
  `isMainConfig` is gone from the package, it had no other caller.
- `camera.cameraType` is checked as a string only. `getURLPostfix` falls back to the
  dahua url and warns, which is what the old `stringToCameraType` did with a name it
  did not know. A wrong snapshot url costs one camera; refusing the config costs the
  whole panel.
- Gave up: a hand-written guard beside the schema, so the two can drift; the panel's
  tests are what hold them together. A field of the wrong type still stops the panel,
  and a hand-typed `backend.port: "5000"` is the realistic case.
- Where: `isInstanceOfConfig` in `apps/panel/src/utils/panel/instanceCheck.ts`.

## 2026-09-12 — Windows boxes are in the field

- Context: about half the fleet is Windows 7, 8, 10, or 11. Those boxes were
  installed by hand with nvm-windows. The jump has to cover them.
- Decision: those boxes stay in the field. Windows 8 holds on the current panel
  and does not switch branch. Windows 10 build 17763 or newer, and Windows 11,
  take Bun.
- Why: Bun 1.4.2 does not run on Windows 8. A branch switch would stop that box
  from pulling `main`.
- Gave up: one runtime for every Windows box on the first jump.
- Amended 2026-09-21: the hold is `OS_HOLD`. The tree stays clean. A later OS
  install plus a restart takes the jump.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md), "Safe release".

## 2026-09-12 — New Ubuntu boxes install Bun

- Context: provisioning was `installAll.sh` (old) and `install-all.sh` (new).
  Both used `n`, and `/usr/local` was owned by the user.
- Decision: new boxes install Bun from `versions.env`.
- Why: the jump runtime is Bun 1.4.2. Node 24 is not the target.
- Gave up: a Node 24 install path for new boxes.
- Amended 2026-09-13: `installAll.sh` is gone (#54). Only `install-all.sh`
  remains.
- Amended 2026-09-14: new boxes install Bun from `versions.env`, not Node 24.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md).

## 2026-09-12 — The bootstrap stays in HEAD

- Context: a box can be offline for months, sometimes years, then boot and pull.
- Decision: the bootstrap stays in HEAD. The `legacy-runtime` tag is permanent.
  There is no `legacy` branch.
- Why: a box that missed the jump still has to install Bun from the legacy Node
  and pnpm on the next restart.
- Gave up: deleting the bootstrap after the fleet has moved.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md), "Safe release".

## 2026-09-12 — The backend becomes ESM

- Context: some target packages are ESM-only. The backend is CommonJS.
- Decision: convert the backend to ESM. `open@11` is then a plain import.
- Why: that is how the backend can load the ESM-only packages in P4. P4 grows
  by about half a day.
- Gave up: staying on CommonJS and wrapping those packages.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md), P4.

## 2026-09-12 — Backend tests move to vitest

- Context: the backend uses jest. The panel and configer use vitest. The
  2026-09-11 entry above left the backend on jest.
- Decision: vitest. Remove jest, ts-jest, and `@types/jest`. Startup tests join
  in P5. The runner is not `bun test`.
- Why: one test runner for the apps. This supersedes the "backend stays on
  jest" line in "Configer tests run with vitest".
- Gave up: jest on the backend.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md), P4 and P5.

## 2026-09-12 — Lint is oxlint and oxfmt

- Context: the repo uses the ESLint and Prettier family.
- Decision: oxlint and oxfmt. Remove that family. Do not upgrade it. Configer
  goes first. Warnings are errors.
- Why: that is the lint stack for the jump. Both tools need a runtime newer
  than Node 18, so they land after Bun is the runner.
- Gave up: an ESLint 10 upgrade.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md), P5.

## 2026-09-12 — The panel stays on TypeScript 6.0.3

- Context: the question was whether the panel must use Volar on TypeScript 7.
  The owner said to use the latest tooling that works.
- Decision: the panel stays on TypeScript 6.0.3 with `vue-tsc` 3.3.11. The
  backend, configer, and config-schema build with TypeScript 7.0.2.
- Why: on 2026-09-12, `vue-tsc` 3.3.11 crashed on TypeScript 7.0.2 and worked
  on 6.0.3. On 2026-09-13, 3.3.11 was still the latest Volar.
- Gave up: TypeScript 7 on the panel until a later `vue-tsc` can load it.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md), "TypeScript 6
  and 7".

## 2026-09-12 — Vite moves to 8

- Context: the panel is on Vite 2. Holding at Vite 7 with `rolldown-vite` was
  the other option.
- Decision: upgrade to Vite 8.3.0. If 8 misbehaves, `vite@7.3.6` with
  `rolldown-vite` is the documented fallback.
- Why: the panel config is small, and the panel PCs run a current Chromium.
- Gave up: holding at Vite 7.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md), "Vite 2 → 8".

## 2026-09-12 — A failed step names itself and starts the last good dist

- Context: a failed `pnpm run build` does not record the step name next to a
  last good tree.
- Decision: name the step and the error, then start the last good `dist`. The
  record is `startup.last.json`. `GET /status` includes it. No `git reset`. No
  toolchain revert.
- Why: a person on site is not required. The box has to come back on the
  previous panel.
- Gave up: reverting the git checkout when a step fails.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md), "When an
  upgrade fails", and P1.

## 2026-09-13 — No `GET /config/schema`; the form descriptor is a build-time import

- Context: the [config-ui plan](plans/config-ui.md) lists `GET /config/schema` in P2
  and leaves it open against "just importing the shared package".
- Decision: do not build it. The panel resolves `@babybox/config-schema` at build
  time, as it has since P1, and the P3 form metadata comes from that same import.
- Why: a runtime descriptor is a second copy of the shape with no reader today
  (motto 1). It would also have to stay in step with the package, and a box serving
  an old descriptor from an old configer to a newly built panel is a drift we would
  then have to detect.
- Gave up: a consumer that cannot compile against the package has no way to learn the
  shape. Nothing is in that position; configer, the backend and the panel all build
  from the same checkout.
- What reverses it: a reader outside this repo, or a panel build that has to run
  against a configer of another version. Then add the endpoint and serve it from the
  same zod schema, so there is still one source.
- Where: [config-ui plan, P2](plans/config-ui.md).

## 2026-09-13 — A write may change `configer.port` and `configer.url`

- Superseded on 2026-09-13 by "A write cannot change `configer.port` or
  `configer.url`" below. The reasoning stopped at configer: nobody checked who else
  reads the two fields, and nothing does.
- Context: P2 asked to either reject a write that changes the port or the prefix of
  the running configer, or accept it and state that it needs a restart.
- Decision: accept it. Both fields are checked like any other field and written.
  The API response says nothing about a restart.
- Why: rejecting leaves hand-editing `main.json` as the only way to change them, and
  removing that is why this feature exists. `index.ts` reads both once when it starts
  listening, so the write does not disturb the running service; it takes effect on the
  next start.
- Gave up: a maintainer can store a port the box only uses after a restart, and can
  store a port nothing can bind. The previous value is in `main.json.bak`.
- No `restartRequired` field in the response: the apply tier is form metadata and
  belongs with the rest of it in P3, where something reads it (motto 1).
- Where: `update()` and `patch()` in `source/apps/configer/src/services/db/main.ts`.

## 2026-09-13 — A write cannot change `configer.port` or `configer.url`

- Context: this reverses "A write may change `configer.port` and `configer.url`"
  above, made earlier the same day. That entry said accepting the write costs only a
  restart, because `index.ts` reads both once when it starts listening. Review
  finding on the P2 PR.
- Evidence it was wrong: nothing outside configer reads either field. The backend
  has the address compiled in
  (`source/apps/backend/src/fetch/constants.ts:1`,
  `CONFIGER_API_URL = "http://localhost:5001/api/v1/config"`) and so does the panel
  (`source/apps/panel/src/api/base.ts:5`). The only reader is
  `source/apps/configer/src/index.ts:30` and `:42`, at bind time. So a stored change
  survives the restart and the readers do not follow it: configer comes up on the new
  address, `fetchConfig()` fails, and the retry loop at
  `source/apps/backend/src/index.ts:61-70` runs every 5s with no cap, so `app.listen`
  is never reached. In production that same backend serves the panel, so the box
  serves nothing and pm2 keeps the stuck process alive. Someone has to go to the box.
  `backend.port` is not in this position: the panel builds its URL from the config at
  `source/apps/panel/src/api/base.ts:17`.
- Decision: `save()` rejects a write, `PUT` or `PATCH`, that moves `configer.port` or
  `configer.url` away from the value the process is running on. One field-level
  `{ path, msg }` error per field, in the same shape as every other rejection:
  `must stay <value>: it changes only by editing main.json and restarting configer`.
  A body that repeats the running values is not a change and passes, so the P3 form
  can keep sending the whole config.
- Why: the old entry weighed "hand-editing `main.json` is the only way to change
  them" against nothing, because it never found the failure. A dead box that needs
  someone on site is worse than a field the API will not write (motto 2).
- Gave up: the two fields can only be changed by editing `main.json` and restarting.
  That includes fixing a stored value the schema rejects: boot warns and keeps
  running on it, and the guard then blocks the fix over the API too.
- What reverses it: one address, read at runtime by both clients — the backend and
  the panel building the configer URL from a value they share with configer, rather
  than from a constant in each. Then the field has a reader and can be written.
- Where: `rejectAddressChange()` and `save()` in
  `source/apps/configer/src/services/db/main.ts`.

## 2026-09-13 — The live apply tier is empty, so the form does not show one

- Context: the [config-ui plan](plans/config-ui.md) listed `units.requestDelay`, the
  two thresholds, `units.voltage.*`, `app.password`, `app.refreshRequestLimit` and
  `babybox.name` as **Live**: "next poll, no action". P3 had to render the tier, so
  it checked every reader.
- Evidence it was wrong: each of those fields is read off the pinia config store, and
  `initializeConfig()` in `panelLoop.ts` calls `setConfig()` once at boot and never
  again — see "The panel deliberately never re-reads the config" in the plan. Nothing
  in the save path updates the store, so a reactive read follows a value that cannot
  change. `babybox.name` is worse than that: `BabyboxName.vue:16` copies it into a
  plain const at setup.
- Decision: there is no live tier. Every field the panel reads is **panel reload**,
  every field the backend reads is **backend restart**, `configer.port` and
  `configer.url` are **configer restart** and the API refuses them anyway, and
  `configer.requestTimeout` has **no reader**. The per-field table with the reader
  that proves each one is in the plan.
- Why: a tier is a promise to the maintainer. "Applies on the next poll" would be a
  promise the box does not keep, and the maintainer would walk away believing a new
  password was live.
- Gave up: nothing. A tier that says "reload the panel" is what the save path does.
- What reverses it: a save path that re-sets the config store, or the backend
  `POST /reload` from P4 — that one moves the unit IPs and `pc.os` from backend
  restart down to panel reload.
- Amendment, P4: it did not move them to panel reload. `POST /reload` is a call to
  the backend, and a panel reload on its own does nothing for a field only the
  backend reads, so "panel reload" would have been the wrong promise. P4 added a
  fourth tier, `backendReload`, and put `units.engine.ip`, `units.thermal.ip` and
  `pc.os` in it.
- Where: the tier table in [config-ui plan](plans/config-ui.md), `applyTierLabels`
  and `configForm` in `source/packages/config-schema/src/form.ts`.

## 2026-09-13 — The form descriptor is a hand-written table beside the schema

- Context: P3 needs a Czech label, a widget, a hint and an apply tier per field. The
  two options were deriving them from the zod schema or writing them out.
- Decision: `source/packages/config-schema/src/form.ts`, an explicit table keyed by
  dotted path. A package test walks `mainConfigSchema.shape` and asserts the
  descriptor's paths are exactly the schema's leaf paths.
- Why: deriving means reading zod's `_def`, which is internal and can move on a patch
  bump — and none of the four things we need is in the schema anyway. The test is
  what keeps the two in step, and it is the reason the table lives in the package
  rather than in the panel.
- Gave up: the Czech label strings ship in configer's and the backend's `dist`, where
  nothing reads them. About 2 KB. Splitting the package into two entry points to
  avoid that costs more than it saves (motto 1).
- Where: `configForm` in `source/packages/config-schema/src/form.ts`,
  `source/packages/config-schema/src/form.test.ts`.

## 2026-09-13 — Save ships disabled in P3

- Reversed on 2026-09-13 by P4, exactly as the entry said it would be. `saveConfig`
  landed, the `disabled` attribute and the Czech line under the row are gone, and
  the button is disabled only while a save is in flight. The rest of the entry is
  kept for the record.
- Context: the P3 checklist asks for the actions row. The write path is P4.
- Decision: Save is rendered, disabled, with a Czech line under the row saying the
  form sends nothing yet. Discard and reset to defaults work; they only change local
  state.
- Why: a row with a missing button reads as a bug, and a working-looking Save that
  does nothing is worse than either. The disabled button plus the sentence is the
  only version where a maintainer cannot come away thinking they saved.
- Gave up: nothing. P4 removes the `disabled` and the sentence in the same commit
  that adds `saveConfig`.
- Where: `#ConfigActions` in
  `source/apps/panel/src/components/config/ConfigForm.vue`.

## 2026-09-13 — A bad IP is a warning, not an error

- Context: the plan asks for "IP validation as a pattern on the text widget". The
  shared schema types both unit IPs and the camera IP as plain strings.
- Decision: a value that is not a dotted quad colours the field
  `BaseInputState.Warning` and prints a Czech line under it. It does not block a
  save. The `pattern` attribute is set too, as a browser hint.
- Why: an error would be the mirror of the bug the read-only `configer.port` avoids —
  a form refusing what the API accepts. `PUT` and `PATCH` take any string here and
  the backend builds `http://${ip}/`, so a hostname works today. Blocking it would
  make the form worse than hand-editing the file for that one case (motto 2).
- Gave up: the form does not stop a typo that only an exact check would catch.
- What reverses it: an IP rule in the shared schema. Then the check is one thing in
  both places and the form can colour it Error.
- Where: `formState` in `source/apps/panel/src/logic/config/configForm.ts`.

## 2026-09-13 — Clearing app.refreshRequestLimit is a form error

- Context: `app.refreshRequestLimit` is the one optional field. No write can remove a
  key: `PATCH` merges and `lodash.merge` cannot delete, and `PUT` fills the key from
  `base.json`, which holds 50000 (learnings.md, Configer).
- Decision: an empty input on a field that holds a stored value is a field-level
  error, "Hodnotu nelze smazat, klíč se přes API odstranit nedá." A field that was
  never set stays empty with no error.
- Why: the alternative is a form that silently drops the edit at save time. The check
  is three lines and it names the one thing the maintainer has to do differently.
- Gave up: turning the refresh off through the form. Setting it to a huge number is
  the way; removing the key still means editing `main.json`.
- Where: `formState` in `source/apps/panel/src/logic/config/configForm.ts`.

## 2026-09-13 — The config page draws only a config the schema accepts

- Context: configer's boot only warns about a stored value the schema rejects and
  serves it anyway, so a box can be running on one.
- Decision: `ConfigForm` parses the body with `parseMainConfig`. On a failure it
  draws no fields and prints one log line per error instead, with the note to fix
  `main.json` by hand and restart configer.
- Why: such a box already has every `PATCH` rejected (learnings.md), so an editable
  form could not repair it in P3 either, and the errors are the useful output. It
  also keeps the form's model a real `MainConfig` rather than a bag of unknowns.
- Gave up: the case where the form would help most. A field-level error would let a
  maintainer fix exactly the bad field once Save exists.
- What reverses it: P4. Once a save can reach configer, seed the form from the raw
  body so the bad field can be corrected in the browser.
- Where: `load()` in `source/apps/panel/src/components/config/ConfigForm.vue`.

## 2026-09-13 — A field that is both changed and warned shows the warning

- Context: `ConfigFormField` picks one `BaseInputState` per field. It tested `changed`
  before `warning`, so typing a hostname into a unit IP turned the border accent and
  the yellow warning border was only reachable on a value the form had not touched —
  that is, on a stored config that already held one. Review finding on the P3 PR.
- Decision: the order is error, warning, changed, neutral. Worst first.
- Why: the maintainer is told the field changed by the `Uloženo:` line under it, by the
  card's change count and by the summary. The warning has no second place to appear, so
  the edit must not hide it.
- Gave up: nothing. A warned field no longer shows that it was edited by its border.
- Where: `inputState` in
  `source/apps/panel/src/components/config/ConfigFormField.vue`.

## 2026-09-13 — POST /reload keeps the old config on any failure

- Context: P4 needs the backend to pick up a saved unit IP without a restart. That
  means reassigning the exported `config` binding in `backend/src/index.ts`, which
  every consumer reads through at call time.
- Evidence that an unguarded swap is lethal: `fetchConfig()` returns `Promise<any>`
  and its failure branch returns `{ status: 408, msg }` with **no `data` key**.
  Assigning that to `config` gives `undefined`, and the next poll throws on
  `config.units.engine.ip`. In production the same process serves the panel, so the
  box serves nothing and pm2 keeps the stuck process alive. Someone drives to the
  hospital.
- Decision: the route swaps nothing until it has a config it checked. A failure to
  fetch, a fetch that throws, or a config missing a field the backend reads all
  leave `config` exactly as it was and answer 503. Only a checked config reaches
  `applyConfig()`, the one writer of the binding.
- The check is hand-written in the backend and covers **only the five fields the
  backend reads**: `units.engine.ip`, `units.thermal.ip`, `pc.os`, `backend.port`,
  `backend.url`. It cannot be zod — the backend's `dist` is installed standalone
  outside the workspace, so the shared package is a type there and nothing more
  (learnings.md, Startup). It is not the whole schema for the same reason as "The
  panel checks the shape it reads, not the whole schema": a stored value the write
  path would refuse but the backend never touches must not block the reload.
- Boot's `fetchConfig()` is unguarded and stays that way. It is not the same case:
  boot loops until configer answers and the box visibly does not come up, where a
  bad hot-swap breaks a box that was working, silently, in the middle of a shift.
- Gave up: a reload cannot repair a stored config the backend cannot read. It says
  so in the 503 and the box keeps running on the config it had, which is the outcome
  we want.
- Where: `isBackendReadableConfig` and `reloadConfig` in
  `source/apps/backend/src/modules/configReload.ts`,
  `source/apps/backend/src/routes/reloadRoute.ts`.

## 2026-09-13 — The reload compares against what the server bound, not against the config

- Context: `POST /reload` has to report the fields it could not apply. Those are
  `backend.port` and `backend.url`, bound at `index.ts:92` and `:109` when the server
  starts listening.
- Decision: `index.ts` keeps a module-level `bound = { port, prefix }`, set at listen
  time, and the reload compares the stored values against that.
- Why: two reasons, and the second is the one that bites. The prefix the process
  really serves is `config.backend.url || process.env.API_PREFIX`, so it may never
  have come from the config at all. And comparing the new config against
  `config.backend.port` after the swap compares a value to itself, so every change
  reports as applied — the easiest bug to write in this phase, and it fails silently
  in the direction that makes the box look fine.
- The port is compared as a string, because `process.env.PORT` is one and the config
  holds a number.
- Gave up: nothing. `bound` is null until the server listens, and the route answers
  503 in that window.
- Where: `bound` in `source/apps/backend/src/index.ts`, `unappliedFields` in
  `source/apps/backend/src/modules/configReload.ts`.

## 2026-09-13 — The "restart required" banner lives in sessionStorage

- Context: the P4 checklist asks for a persistent banner after a save. The save ends
  in `window.location.reload()`, which wipes every component, so the plan contradicts
  itself: component state cannot outlive the thing that makes the save take effect.
- Decision: before reloading, the panel writes the banner text to `sessionStorage`.
  `ConfigView` reads it on the way up and renders it, dismissible.
- `sessionStorage`, not `localStorage`: it survives `location.reload()` in the same
  tab and dies with the session. A `localStorage` banner would still be on screen
  days after someone restarted the backend.
- **The text comes from the reload's answer, not from the field's apply tier.** If
  the reload applied the unit IPs there is nothing left to restart for them, whatever
  the tier says; if the reload failed, every backend-read field is on the old value,
  not just the two in the restart tier. A tier is a promise made before the save; the
  banner is a report of what the box did.
- A save that reaches the reload always writes the marker, and a null text removes
  it, so a save that needs no restart clears what an earlier one left. The two
  outcomes that send nothing do not write it, because a save that did not happen
  changes nothing about what still needs a restart.
- Gave up: the banner is per tab. Another tab on the same box does not show it. The
  panel runs one tab on a box, so nobody is in that position.
- Where: `source/apps/panel/src/logic/config/restartBanner.ts`,
  `source/apps/panel/src/views/ConfigView.vue`.

## 2026-09-13 — The form still draws only a config the schema accepts

- Context: "The config page draws only a config the schema accepts" above says P4
  reverses it — once a save can reach configer, seed the form from the raw body so a
  bad stored field can be fixed in the browser. P4 looked at the code and did not.
- Decision: leave it. `ConfigForm` keeps refusing to draw a config `parseMainConfig`
  rejects, and prints the errors.
- Why: it is not the small change the earlier entry assumed. `loaded`,
  `toFormValues`, `defaultFormValues`, `formState` and `buildConfig` all take a
  `MainConfig`; seeding from a raw body means every one of them takes a draft, and
  the form needs a rule for a section that is missing outright, not just wrong. It is
  not on the P4 checklist, and a half-done repair path is worse than none (motto 1).
  P4 already touches the one code path that can kill a running box; this is not the
  phase to widen it.
- Gave up: the case where the form would help most, still. The errors name the field
  and `main.json` plus a configer restart is still the way.
- What reverses it: a phase that owns the draft type end to end, with a test that a
  form seeded from a body with one bad field saves the corrected whole config. The
  save path it needs now exists, so it is a panel-only change.
- Where: `load()` in `source/apps/panel/src/components/config/ConfigForm.vue`.

## 2026-09-13 — The backend serves index.html for any unmatched GET in production

- Context: the panel's router is `createWebHistory()`, so `/config` is a real URL
  path. In production the backend serves the panel, and it registered
  `express.static(PUBLIC_DIR)` and `app.get("/")` and nothing else. P4 is the first
  phase that makes the browser hard-load a client route: `saveConfig` ends in
  `window.location.reload()`, which issues `GET /config`.
- Evidence: express matched nothing, so the box answered `Cannot GET /config`.
  `ConfigView` never mounted, so the "restart required" banner never rendered
  either — the one thing the reload exists to carry across. Vite's dev server has
  its own SPA fallback, so none of this shows locally. Three of the six reviewers on
  the P4 PR found it independently.
- Decision: the production block registers `app.get("*")` after the static
  middleware, and it sends `index.html` with the same `no-cache` header the `/`
  route uses. It sits after every API mount, so it can only see a path nothing else
  matched.
- Why: it is the standard fallback for a history-mode SPA and it is four lines. The
  alternatives were worse: hash-mode routing changes every URL on every box, and
  listing the client routes by hand is a second copy of the router.
- Gave up: an unknown API path under the prefix now answers the panel's HTML with a
  200 instead of a 404. Nothing calls an unknown API path, and the panel's own
  clients read the body, so a wrong shape surfaces at the caller.
- What reverses it: serving the panel from something other than this express app.
- Where: the `NODE_ENV === "production"` block in
  `source/apps/backend/src/index.ts`, tested in
  `source/apps/backend/src/__tests__/panelFallback.test.ts`.

## 2026-09-13 — backend.port stays writable, unlike configer.port

- Context: a reviewer on the P4 PR argued `backend.port` should be `readOnly` in the
  form the way `configer.port` and `configer.url` are. In production the backend
  serves the panel on that port, so once someone restarts it the open browser tab is
  on an address nothing is listening on.
- Decision: it stays writable. The save reports it in the reload's `unapplied` list
  and the banner names both the change and the address the panel will be on.
- Why: the two cases are not the same failure. A stored `configer.port` change binds
  on the next **unattended** reboot; the backend then retries `fetchConfig()` for
  ever, never reaches `app.listen`, and the box serves nothing with nobody in the
  loop (learnings.md, Configer). A stored `backend.port` change binds only during a
  restart a human performs on purpose after reading the banner, and it self-heals:
  `index.ts` calls `open("http://localhost:" + port)` on every production start, so
  the restart reopens the browser on the new port by itself.
- Gave up: a maintainer who restarts the backend from a shell rather than letting it
  come up on its own has to retype the address. The banner tells them which one.
- What reverses it: production no longer calling `open()` on start — for example a
  box where the browser is launched by something else, or a kiosk profile that
  ignores it. Then a port change strands the screen with no way back and the field
  belongs in the read-only set.
- Where: `configForm` in `source/packages/config-schema/src/form.ts`, `bannerFor` in
  `source/apps/panel/src/logic/config/restartBanner.ts`.

## 2026-09-13 — No auth on the configer write endpoint, and why a password header is theatre

- Context: the P5 checklist says "decide on auth for the configer write endpoint",
  and [config-ui.md](plans/config-ui.md) risk 4 suggests the cheapest honest option
  is to require `app.password` as a header, checked server-side.
- Evidence, checked against the code on this branch:
  - `GET /api/v1/config/main` (`configer/src/routes/configRoute.ts:19`) has no auth
    and returns the whole config, `app.password` and `camera.password` in clear.
  - Both servers call `app.listen(port, cb)` with no host
    (`configer/src/index.ts:43`, `backend/src/index.ts:155`), so both are on every
    interface, not on loopback.
  - Both mount `cors()` with no `origin` option, so both answer
    `Access-Control-Allow-Origin: *`. The reach is therefore wider than the LAN: any
    web page open in any browser that can route to the box can read the config and
    send a `PATCH`.
  - `GET <prefix>/units/actions/opendoors` (`backend/src/routes/unitsRoute.ts:34`,
    `Action` in `backend/src/types/units.types.ts:12`) opens the babybox doors with
    no auth, over a `GET`. (The P5 brief put this on `engineRoute`; it is
    `unitsRoute`. `engineRoute` has `GET /data` and `PUT /watchdog` only.)
- Decision: no auth. The P5 checklist item is closed as **decided against**, not
  skipped, and the exposure is written down here and in `CLAUDE.md`.
- Why: a header checked on the write path is circular. Whoever can send the header
  can first `GET /config/main` and read the password out of the answer, so the check
  costs a round trip and stops nobody. And the config endpoint is not the weakest
  thing on that network: the same caller can already open the doors of a babybox
  with one unauthenticated `GET`. Locking the config while the doors stay open would
  buy the appearance of security and none of it.
- Why not option (b), masking the two passwords in `GET` and verifying server-side:
  it is not merely expensive, it breaks every box. The panel boots by putting the
  `GET /config/main` body straight into the pinia store
  (`panel/src/logic/panel/panelLoop.ts:217`). `TheNav.vue:43` unlocks the nav by
  comparing the typed password against `app.password` from that store, so a
  sentinel in the answer **becomes the panel password on every box** — strictly
  worse than today. `useCamera.ts:71` builds `http://user:password@ip/...`, so the
  camera image dies with it. Masking only for some callers needs a way to tell them
  apart, which is the circular problem again.
- Gave up: anything on the network can still change the unit IPs and the app
  password. A confirm dialog in the form does not help there — it is in the browser,
  and an attacker does not use the browser.
- What reverses it: the box moving onto a network we do not trust, or auth landing
  on the backend's action routes. The two go together, and the real fix is not a
  header. Every client of configer is on the box itself — the panel's bundle and the
  backend both have `http://localhost:5001` compiled in
  (`panel/src/api/base.ts:5`, `backend/src/fetch/constants.ts:1`) — so binding
  configer to `127.0.0.1` closes the whole hole, read included, for one argument.
  It is left out of P5 on purpose: it changes the network behaviour of every
  deployed box on an unattended update (motto 3), it belongs in the same phase as
  the door-control routes, and shipped alone it would say the box is protected when
  it is not.
- Where: this entry, the P5 checklist in [config-ui.md](plans/config-ui.md), the
  "Network exposure" section of `CLAUDE.md`.

## 2026-09-13 — Still no `@vue/test-utils`; the Save rule is tested without mounting

- Context: P3 and P4 both refused the dependency and pushed the component test to
  P5. P5 is where that runs out, so this is the decision, not another deferral.
- Decision: no `@vue/test-utils`. The P5 item "a component test that a bad value
  blocks Save" is closed as covered by two tests that already exist.
- Why: both halves of the rule are tested in the layer that owns them.
  `configForm.test.ts` "blocks the form when one field is invalid" proves a bad
  value sets `hasErrors`; `saveFlow.test.ts` "sends nothing when the form has
  errors" proves `hasErrors` makes `runSave` return without calling `saveConfig`.
  P4 extracted `saveFlow.ts` from the component precisely so this needs no mount.
  What is left uncovered is the wire between them — the argument `onSave` hands to
  `runSave` — and buying that costs a `pnpm-lock.yaml` change, which every box
  applies through `pnpm install --frozen-lockfile` on an unattended update
  (motto 3). A lockfile risk on every deployed box, for one argument, is the wrong
  trade.
- **An earlier draft of this entry said the rule was "tested end to end". That was
  overstated and a reviewer caught it.** Both ends are proved; the wire is not. Hard
  code that argument to `false` and a bad config would go out with every test green.
  The honest claim is the one above.
- What shrank the gap instead of a dependency: the confirm logic went into
  `nextSaveStep`, a pure function over `(state, pending)` with a case per branch, so
  the component decides nothing on its own. That was the reviewer's suggestion and
  it is the same shape P4 used for `runSave`'s injected calls.
- Gave up: nothing mounts a Vue component in this repo, so the wiring between a
  component and its logic module is never checked by a test. Two lines in `onSave`
  now sit on that gap: the argument to `runSave`, and the `pendingQuestion` it
  passes to `nextSaveStep`.
- What reverses it: a phase that needs the rendered output itself — a widget that
  picks its input from the descriptor, or a keyboard flow. Then the dependency pays
  for more than one line and goes in with the lockfile diff shown in the PR.
- Where: `logic/config/saveFlow.ts` and its test, `logic/config/configForm.ts` and
  its test.

## 2026-09-13 — The confirm dialog is field metadata, asked once, and never prints a secret

- Context: the P5 checklist asks for a confirm dialog on `app.password`,
  `backend.port`, `configer.port` and both unit IPs.
- Decision: `FormField` gains `confirm?: string`, the Czech reason the field is
  dangerous. `logic/config/confirmSave.ts` turns the form state into one question;
  `ConfigForm.onSave` puts it through `window.confirm`.
- One dialog, not one per field: the form sends every field in a single `PATCH`, so
  one press of Save is one action. Five dialogs would ask five times about it. The
  question names each dangerous field **that actually changed**, with the value the
  box runs on and the value it would move to, so answering does not depend on
  remembering what was typed.
- The rule that builds the text is a pure function with its own test, so the
  component only passes the string on and needs no mounting to be checked. See the
  entry below: `window.confirm` was the first way it was shown, and it was wrong.
- **`configer.port` gets no dialog.** It is `readOnly`, and `formState` sets
  `changed: !field.readOnly && ...`, so it can never be reported as changed and the
  question could never appear. A row in the table for it would be dead metadata; a
  test asserts no read-only field carries one.
- **`backend.url` gets one, which the checklist did not ask for.** It strands the
  panel exactly the way `backend.port` does — `backendApi()` builds
  `http://localhost:${port}${url}` — and the plan's own table puts both on the same
  `backendRestart` tier for the same reason. Asking about one and not the other
  would be arbitrary.
- **A secret is named but never printed.** `app.password` shows as "mění se,
  hodnota se nezobrazuje", or "maže se, zůstane prázdné" when it is being cleared.
  The panel is a screen in a hospital room; putting the old and the new password on
  it to confirm a save would leak more than the save does. Clearing it is called out
  separately because an empty `app.password` unlocks the nav for anyone: `TheNav`
  compares the typed password against the stored one, and both are empty strings at
  boot, so every locked page opens with no password typed.
- Gave up: the dialog is browser-side, so it guards a maintainer's slip and nothing
  else. See the auth entry above — it is not a security control.
- Where: `confirm` in `packages/config-schema/src/form.ts`,
  `panel/src/logic/config/confirmSave.ts`, `onSave` in
  `panel/src/components/config/ConfigForm.vue`.

## 2026-09-13 — The confirmation is two presses of Save, not `window.confirm`

- Context: `App.vue` sends a heartbeat every 5s to `GET <prefix>/restart/refresh`.
  `backend/src/modules/restart.ts` ticks every 20s and runs `shutdown -r` after 9
  misses in a row.
- Problem: `window.confirm` blocks the tab's event loop, so an open dialog stops the
  heartbeat and the box reboots in about three minutes. It also froze `ConfigView`'s
  ten-minute bounce. The dialog meant to prevent an outage caused one.
- Decision: no dialog and no new component. `nextSaveStep` in `confirmSave.ts` turns
  one press of Save into `ask` or `send`, and `ConfigForm` renders the question in
  the page with "Ano, uložit" and "Zrušit". Nothing blocks.
- The pending question is matched as **text**, not as a flag: editing another
  dangerous field while the question is up rewrites it, so the maintainer is asked
  again about what they would actually save.
- A save the form already blocks goes straight to `send`. `runSave` stops on
  `hasErrors` and reports it, so asking first would ask about a save that cannot go.
- This supersedes the `window.confirm` part of the entry above.
- Where: `nextSaveStep` in `panel/src/logic/config/confirmSave.ts`, `onSave` and
  `onCancelConfirm` in `panel/src/components/config/ConfigForm.vue`.

## 2026-09-13 — Config sections are full-width and open on a click of the heading

- Context: the config page laid sections in a wrapping grid. The units card is
  eight fields and the pc card is one, so a row's short cards sat in empty space
  under the tall one.
- Decision: each section is a full-width block. The heading is a button. The
  fields stay hidden until that heading is pressed. The first section starts
  open so the pattern is visible. Open fields sit in a wrapping grid inside the
  block, so a long section still uses the width instead of growing down the page.
- Why: every heading is then the same height, so nothing is pushed down by a
  neighbour. A maintainer opens only the block they came to edit.
- Gave up: seeing every field at once. The heading still shows the change count.
- Where: `ConfigFormSection.vue`, `.config-sections` in `ConfigForm.vue`.

## 2026-09-13 — Warning colour is orange, and buttons share one variant union

- Context: `styles.json` used `#FFFF00` for warning. The reset button, the log
  date, the result pane and the dashboard warning cells all picked it up. The
  action buttons were also copied as global `button.btn-*` rules in two pages.
- Decision: warning is `#E07A1F` (hover `#C45A12`, text `#F0A04B`). `BaseButton`
  takes a `variant` of `"primary" | "success" | "error" | "warning" | "accent"`.
  Hover runs a looping gradient on that accent. Disabled stops the animation.
- Why: neon yellow on a near-black panel is unreadable and does not match the
  indigo/purple palette. One component is one set of colours; a union is the
  closed set the template can pass.
- Gave up: a warning that shouts in yellow. Orange still reads as warning next
  to green and red.
- Where: `public/config/styles.json`, `types/base/baseButton.types.ts`,
  `components/panel/HTMLElements/BaseButton.vue`.

## 2026-09-13 — Panel message keeps the old yellow and red

- Context: warning fill and text both moved to orange so buttons, table cells
  and the highlight message changed together. The message on the main panel
  still has to read as the old neon yellow and the old error red.
- Decision: `color.message.warning` is `#FFFC31` and `color.message.error` is
  `#e01c0d`. `HighlightMessage` applies those on the message. `BaseButton` and
  the shared warning/error fills stay on the new orange/red gradients.
- Why: nurses already know the old message colours. The restyle was for the
  action buttons, not the banner.
- Gave up: one warning/error pair for every surface.
- Where: `public/config/styles.json`, `components/panel/elements/HighlightMessage.vue`.

## 2026-09-14 — The runtime is Bun 1.4.2

- Context: the 2026-09-13 target was Node 24 and pnpm 12.
- Decision: Bun 1.4.2, pinned. One zip, installed under the user profile, with
  `bun.lock`. Node 18 and pnpm 7 stay as the bootstrap host and the
  `pnpm run build` hook.
- Why: one binary is the runtime and the package manager. The boxes do not
  need a second Node and a second pnpm.
- Gave up: Node 24 and pnpm 12.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md), "Bun as
  runtime and package manager".

## 2026-09-14 — Every compile unit uses the TypeScript contract

- Context: the apps do not share one strict flag set. The backend has
  `noImplicitAny` only.
- Decision: the TypeScript contract. Extra flags on every compile unit. No
  `any`. No `!`. No `as` except a tracked suppression. Configer goes first.
- Why: `strict: true` is the floor. A flag stays on when a phase is red.
- Gave up: turning a flag off to make a phase green.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md), "TypeScript
  contract".

## 2026-09-14 — HTTP, the bundle, and tests stay Express, Vite, and vitest

- Context: Bun can replace Express, Vite, and vitest with `Bun.serve`,
  `bun build`, and `bun test`.
- Decision: Express 5, Vite 8, and vitest 5.
- Why: the jump changes the runtime and the libraries. It does not rewrite the
  servers or the test runner.
- Gave up: Elysia, `Bun.serve`, `bun build`, and `bun test`.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md).

## 2026-09-14 — Dev servers run under bun --watch

- Context: the backend uses `ts-node` through nodemon. Configer uses
  `nodemon --esm`.
- Decision: `bun --watch`. Remove `ts-node`, `tsx`, and nodemon. Do not add
  `tsx`.
- Why: Bun is the runtime. `bun --watch` does not need the TypeScript
  JavaScript API.
- Gave up: `tsx` as a second dev runner.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md), "Dev runners".

## 2026-09-21 — Topic work lands on feat/toolchain-jump

- Context: the upgrade is many commits. A box must not receive them one phase
  at a time on `main`.
- Decision: `feat/toolchain-jump` is the long-lived branch. Topic pull requests
  merge into that branch. `main` gets one merge after the canary. Do not delete
  the branch.
- Why: a box on `main` then receives the whole tip in one `git pull`.
- Gave up: merging each phase to `main` on its own.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md), "Safe release".
  #102 is the open pull request into `main`.

## 2026-09-21 — Each topic is one pull request into feat/toolchain-jump

- Context: the long-lived branch needs a reviewable record for each box in the
  plan.
- Decision: open one pull request into `feat/toolchain-jump` for every topic.
  Do not merge it unless the owner asks. #102 stays the open pull request into
  `main`.
- Why: the topic pull request is the review. The merge to `main` waits for the
  canary.
- Gave up: committing a topic straight onto `feat/toolchain-jump`.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md), "Safe release".

## 2026-09-21 — A restart is the release

- Context: a box updates when it restarts. The startup app runs `git pull`,
  then maybe `pnpm run build`.
- Decision: a pull, or a checkout, done before the restart still builds, unless
  the OS is on hold.
- Why: both arrivals have to end with a panel on screen. Today a checkout that
  is already up to date skips the build. P1 changes that rule.
- Gave up: a fleet-wide command at merge time.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md), "Safe release".

## 2026-09-21 — Windows 8 holds in place

- Context: Bun 1.4.2 needs Windows 10 build 17763 or later. Windows 8 cannot
  run that binary.
- Decision: `OS_HOLD`. The current panel stays up. The git branch does not
  change. The tree stays clean.
- Why: a branch switch stops later pulls of `main`. Exit code 0 would make the
  old startup swap `dist`.
- Gave up: parking a Windows 8 box on another branch.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md), "Hold
  operating systems".

## 2026-09-21 — Windows 10 and 11 jump at build 17763

- Context: Windows 10 and Windows 11 share the `10.0.` release string. The
  build number is what Bun checks.
- Decision: jump when the build is 17763 or newer. Older Windows 10 uses the
  same hold as Windows 8.
- Why: Bun 1.4.2 requires Windows 10 version 1809, which is build 17763.
  Windows 11 is build 22000 or newer and takes the jump.
- Gave up: treating every `10.0.` release as able to run Bun.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md), "Hold
  operating systems".

## 2026-09-21 — Ubuntu takes the jump

- Context: `install-all.sh` provisions new Ubuntu boxes.
- Decision: Ubuntu takes the jump.
- Why: `install-all.sh` already requires Ubuntu 22.04 or newer and installs
  `unzip`.
- Gave up: a separate Ubuntu hold.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md), "Hold
  operating systems".

## 2026-09-21 — Do not download the baseline Bun zip

- Context: Bun publishes a `*-baseline` zip. It looks like a fallback for an
  older CPU.
- Decision: do not use it. An illegal instruction is `CPU_HOLD`.
- Why: the baseline zip is an alias of the same x64 binary. That binary still
  needs SSE4.2.
- Gave up: a second download when the first binary traps.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md), "CPU that
  cannot run the Bun binary".

## 2026-09-21 — Registry dependencies use exact versions

- Context: `package.json` used ranges. A later install could move a package
  without a commit.
- Decision: every registry specifier is an exact version, `1.2.3`. No `^`,
  `~`, `*`, `latest`, or range. The lockfile matches. P0 pins the packages
  that are already installed. Later phases write the new exact version.
  Renovate bumps stay exact.
- Why: the version in `package.json` is the version that installs.
- Gave up: caret and tilde ranges.
- Where: [dependency upgrade plan](plans/dependency-upgrade.md), "Known
  constraints". The P0 pin is #109.

## 2026-09-21 — The runtime install skips devDependencies

- Context: startup copies the backend `package.json` into repo-root `dist/` and
  runs `pnpm install`. That manifest lists jest, newman, eslint, typescript, and
  the `@types` packages as devDependencies. The running server imports none of
  them. `start:main` runs the same install again on every boot. The workspace
  install inside `pnpm run build` is a separate step. It has to keep
  devDependencies, because the box compiles with `tsc`, `vue-tsc`, and `vite`.
- Decision: the `dist/` installs are `pnpm install --prod`. The workspace
  installs the box runs (`build`, `install-all.sh`, `install.sh`, `install.bat`)
  are `pnpm install --frozen-lockfile`. The rollback install uses
  `../../../dist`, the same directory as the install it rolls back.
- Why: `--prod` is the pnpm 7.5.0 flag that skips devDependencies. The backend
  already splits the two sets. `--frozen-lockfile` is what CI already requires
  for the workspace, and it skips resolution when the lockfile matches. The
  rollback command was aimed at `source/dist`, so a failed update restored the
  runtime folder and then installed dependencies in a different folder.
- Gave up: a production install of the workspace. The compiler lives in
  devDependencies, and the box still builds after `git pull`. Also left the
  install in `start:main`. A boot that finds `dist/` without `node_modules`
  still needs it, and with `--prod` that install no longer fetches the test tools.
- Where: `source/package.json`, `apps/startup/src/logic/start/ubuntu.js`,
  `apps/startup/src/logic/start/windows.js`, the ubuntu and windows install
  scripts, `docs/learnings.md`.
