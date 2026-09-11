# Config UI — agent workflow

Status: **P0 in review, threads addressed**
Last updated: 2026-09-11

How each phase of [config-ui.md](config-ui.md) gets built. Same pipeline for every
phase; only the implementation brief changes. Rules of the road are in
[mottos.md](../mottos.md), [decisions.md](../decisions.md) and
[learnings.md](../learnings.md); every agent reads all three first.

## Pipeline

```
Implement ──► Review (4 lenses) ──► Verify (1 refuter / finding) ──► Post (1 PR review)
                                                                          │
              Check (build, tests, CI, 0 open threads) ◄── Address ◄──────┘
                  │ fails
                  └──► Address again (max 1 retry)
```

| Stage | Agents | Model | Writes to repo | Output |
|---|---|---|---|---|
| Implement | 1 | Opus | yes: branch, commits, PR | PR number, head SHA, summary |
| Review | 4, parallel | default | no | findings with file, line, severity |
| Verify | 1 per finding | default | no | keep / refute with reason |
| Post | 1 | default | no (GitHub only) | one PR review with inline comments |
| Address | 1 | Opus | yes: commits, docs | per thread: fixed or pushed back, replied, resolved |
| Check | 1 | default | no | build, tests, CI status, open thread count |

Everything runs in one worktree. Stages that write run alone, so no worktree
isolation is needed. Reviewers and verifiers are told they are read-only.

## Stage rules

**Implement.** Follows the phase brief from config-ui.md, the mottos and the
learnings. Small conventional commits. Adds or updates tests. Updates
decisions.md when it makes a call the plan left open. Opens the PR against `main`
with a body that lists what changed, what is deliberately left out, and how to test.

**Review lenses.** Each agent reads the PR diff and the touched files, nothing else
is edited. Every finding names a file and a line in the diff, a severity
(`blocker` / `should` / `nit`), and a concrete suggestion.

1. Correctness: error paths, ordering, concurrency, what happens on a half-written
   file, does the code do what the PR says.
2. Upgrade safety: can an old box run `git pull`, `pnpm install --frozen-lockfile`,
   `pnpm build` and start with its existing `main.json`. Lockfile, Node 18.12.1,
   stderr from the build, gitignore, relative paths from `dist`.
3. Simplicity and types: anything built for a future need, `any`, duplicated shapes,
   dead code, comments that repeat the code.
4. Tests: do they check behaviour, do they cover the phase's acceptance list, do they
   run in CI.

**Verify.** One agent per finding tries to refute it against the code. Unsure means
refuted. Nits survive only when the refuter agrees they matter.

**Post.** One review, event `COMMENT`, with all surviving findings as inline comments
on the head SHA. A finding whose line is not in the diff becomes a file-level comment.
Nothing is posted as "approve" or "request changes"; humans do that.

**Address.** Reads every unresolved thread. For each one: fix it in a small commit, or
push back with a reason. Always reply in the thread, then resolve it. Adds new
learnings and decisions to the docs, ticks the phase checklist in config-ui.md.
Pushes at the end.

**Check.** Runs the configer, backend and panel builds and the tests locally, waits
for CI on the PR, counts unresolved threads. Fails the run if any is red. One retry
through Address, then stop and report.

## Exit

The run ends with the PR open, CI green, zero unresolved review threads, and the
docs updated. Merging is a human decision.

## Phase briefs

- **P0** — make writing the config safe. Brief: the P0 checklist in config-ui.md,
  plus: add a configer test step to `.github/workflows/ci.yml`, gitignore
  `main.json.bak`, `main.json.tmp` and `main.json.corrupt`, keep the on-disk `main.json` shape unchanged.
- P1 to P5 — written when P0 is merged, after the zod decision.
