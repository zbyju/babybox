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

- Context: lowdb truncates then rewrites `main.json`. A power cut mid-write leaves a
  corrupt file, and both backend and panel refuse to start without one.
- Decision: write to `main.json.tmp`, `fsync`, rename over `main.json`. Before the
  rename, copy the current file to `main.json.bak`. On boot, if `main.json` does not
  parse, load `main.json.bak` and log it.
- Why: rename is atomic on the filesystems we run on (ext4, NTFS). One backup covers
  the failure we actually see. A history with N versions is a later decision.
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
