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
  parse, load `main.json.bak` and log it.
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

## 2026-09-11 — The camera type list is the panel's list, and case does not matter

- Context: the plan asked for a union of the camera types the rest of the system
  supports. The backend does not read `cameraType` at all; the panel does, in
  `apps/panel/src/utils/panel/camera.ts`.
- Decision: the allowed list is `dahua`, `hikvision`, `avtech`, `avm`, `vivotek`, and
  the check lower-cases the value before comparing. `pc.os` stays an exact match.
- Why: deployed `main.json` files hold `DAHUA` as well as `dahua`, and the panel
  matches case-insensitively. A stricter check would reject a config that works today.
  `pc.os` is compared with `=== "ubuntu"` in the backend, so there case does matter.
- Gave up: the TS type is the lower-case union while the check accepts any case. The
  gap is deliberate; closing it would mean rewriting a value the maintainer typed.
- Where: `source/apps/configer/src/types/main.types.ts`.

## 2026-09-11 — A corrupt main.json never overwrites main.json.bak

- Context: boot rewrites `main.json` after merging `base.json`. If it had backed up
  first, recovering from a corrupt file would copy the corrupt file over the good
  backup and lose the only copy.
- Decision: take the backup only when the current `main.json` parses.
- Why: one rule, no flag to pass around, and the backup can only ever hold a file we
  managed to read.
- Where: `write()` in `source/apps/configer/src/services/db/main.ts`.

## 2026-09-11 — An unreadable main.json is kept as main.json.corrupt

- Context: boot rewrites `main.json` from the backup or from `base.json`, so the file
  the maintainer broke was gone. Until the UI ships, `main.json` is edited by hand on
  every box, so a typo (a trailing comma, a BOM from Notepad) plus a restart is normal.
- Decision: on boot, when `main.json` exists but does not parse, copy it to
  `main.json.corrupt` before falling back. `main.json.corrupt` is gitignored.
- Why: the box still comes up, and the edit is still there to recover from. Before this
  PR lowdb threw and configer did not start, which at least left the file alone.
- Gave up: nothing. One extra file per broken edit, overwritten by the next one.
- Where: `loadStored()` in `source/apps/configer/src/services/db/main.ts`.

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
