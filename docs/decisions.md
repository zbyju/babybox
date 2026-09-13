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
