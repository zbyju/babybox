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
  parse, load `main.json.bak` and log it. Only a PUT writes, see
  "Boot reads main.json and never writes it" below.
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
- Decision: boot merges in memory only. The only writer is `PUT /config/main`, so
  `main.json.bak` is always the config before the last PUT. `main.json.corrupt` is
  gone. Confirmed on 2026-09-12: nothing outside this repo reads or writes
  `main.json`.
- Why: one backup that means one thing, and a reboot can no longer destroy it.
- Gave up: after a boot `main.json` on disk shows only the keys someone typed, not
  the full merged shape. `GET /config/main` and `base.json` still show the full
  shape. A fresh box has no `main.json` until the first PUT.
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
- Where: `source/apps/configer/src/types/main.types.ts`.
