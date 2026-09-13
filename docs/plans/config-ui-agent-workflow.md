# Config UI — agent workflow

Status: **P3 merged, P4 in review**
Last updated: 2026-09-13

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
  `main.json.bak` and `main.json.tmp`, keep the on-disk `main.json` shape unchanged.
- **P1** — one config schema shared by configer, the panel and the backend. Brief: the
  P1 checklist in config-ui.md and the decision "The config shape is one zod schema in
  a shared package" in decisions.md, plus:
  - New package `source/packages/config-schema`, name `@babybox/config-schema`,
    `"type": "module"`, `main` and `types` pointing into `dist/`, built by `tsc` with a
    tsconfig like configer's (node16, strict, `*.test.ts` excluded). `zod` pinned to
    exactly `3.23.8`; `vitest` as a devDependency at the version configer already has,
    so the lockfile gains no other new version.
  - The schema keeps every rule `validateMainConfig` has today: integers with the same
    ranges, exact `cameraType` and `pc.os` lists, unknown keys rejected in every
    object, `startup` any object, `app.refreshRequestLimit` optional. Errors keep the
    `{ path, msg }` shape with a dotted path, one entry per unknown key. Wording may
    change; every configer test that asserted a message is updated, none is deleted.
  - Configer's `main.types.ts` becomes a thin re-export. `parseMainConfig` and
    `validateMainConfig` wrap `safeParse`. `db/main.ts` and the route do not change
    behaviour.
  - Panel: `config.types.ts`, the config half of `instanceCheck.ts` (the versions guard
    stays) and `config.default.ts` come from the package. Drop `app.version` if nothing
    sets it. Replace the `CameraType` enum and the `includes` matching in
    `utils/panel/camera.ts` with the schema's union; `avm` keeps the avtech URL.
  - Backend: `types/config.types.ts` re-exports the type through a tsconfig `paths`
    entry and `import type` only. No entry in the backend's `package.json`. Check the
    built `dist` has no `require("@babybox/config-schema")`.
  - Defaults: `base.json` stays the file on disk. The package exports `defaultConfig`;
    a configer test asserts `base.json` deep-equals it; the panel's defaults are that
    export. Record it in decisions.md if you choose otherwise.
  - Wiring: root `build` and `dev` scripts and CI build the package before the apps;
    CI runs the package tests. Update `pnpm-lock.yaml` only through pnpm 7.5.0 on
    Node 18 (learnings.md). The lockfile diff is the new importer, `zod`, and the
    `link:` entries, nothing else.
  - Before opening the PR, from a clean `git clone` under Node 18: `pnpm install
    --frozen-lockfile` then `pnpm run build` from `source/`, both with empty stderr.
    Then the four test suites.
  - PR title `feat: share one config schema across the apps`.
- **P2** — the configer write path gets a partial update. Brief: the P2 checklist in
  config-ui.md, plus:
  - `PATCH /config/main` merges the body over the config the process is running on,
    where `PUT` merges it over `base.json`. That one difference is the whole feature:
    a key left out of a `PATCH` keeps its stored value.
  - The merge and the write live in `services/db/main.ts` beside `update()`, and both
    writers go through one `save()`, so there is no second write path to keep atomic.
    The route stays as thin as the existing one.
  - The same rejections as `PUT`, with the same `{ path: "", msg }` errors: a
    non-object body, because `lodash.merge` spreads a string over the target, and an
    empty body, because `express.json()` leaves `req.body` as `{}` when the
    Content-Type header is missing. Both are in learnings.md.
  - Status codes and the response body match `PUT`: 200 with the saved config, 400
    with field-level errors, 500 on a write failure.
  - No array rule for `lodash.merge`: the schema has no array field.
  - `configer.port` and `configer.url` cannot be written: nothing outside configer
    reads them, so a stored change would leave the box serving nothing after the next
    restart. `save()` rejects a body that moves either one away from the running
    value; a body that repeats them passes. In decisions.md.
  - Not built: `GET /config/schema`, and no `restartRequired` in the response. Both
    are in decisions.md with what would reverse them.
  - Tests per validation branch in `routes/configRoute.test.ts` and
    `services/db/main.test.ts`, in the style already there. The `PATCH` test that
    proves the merge base changes a key away from its default first — a test that
    starts from the defaults cannot tell which side the merge came from
    (learnings.md). Key order in the written file and `main.json.bak` are checked too.
  - PR title `feat: add a partial config update endpoint`.
- **P3** — the panel gets a config page. Brief: the P3 checklist in config-ui.md,
  plus:
  - The form descriptor is `packages/config-schema/src/form.ts`, exported from
    `src/index.ts`: an explicit table keyed by dotted path, not derived from zod's
    `_def`, so a zod patch bump cannot move it. A package test walks the schema's
    `.shape` and asserts the descriptor's paths are exactly the schema's leaf paths.
    `startup` has an empty shape, so it yields no leaf and gets no row.
  - Every apply tier is checked against the reader, not copied from the plan's old
    table. The live tier turned out to be empty; the table in config-ui.md now names
    the reader per field.
  - `api/config.ts` gets `getConfig` only. It reuses `CONFIGER_API_URL` and
    `requestJson`, the same pair `panelLoop.ts` uses. The `CONFIGER_TIMEOUT` constant
    moved from `panelLoop.ts` to `api/base.ts` so both callers share one value.
    `getConfig` must not touch the pinia config store; the panel sets it once at boot
    on purpose.
  - The form keeps its own copy of the whole config, because the store only holds
    five of the eight sections.
  - Save ships rendered, disabled, with a Czech hint. Discard and reset only change
    local state and work. In decisions.md with what reverses it.
  - No new dependency, not even `@vue/test-utils`. A lockfile change is update-path
    risk and the component test is P5's job. Tests are plain vitest over the pure
    form logic in `logic/config/configForm.ts`.
  - Panel eslint with no `--fix` has to be clean; `simple-import-sort` and `prettier`
    are enforced in CI. Panel typecheck has to gain no error over the baseline on
    `origin/main`, which is 20, not the 17 the docs said.
  - PR title `feat: add the config page to the panel`.
- **P4** — a saved config is applied without editing the file. Brief: the P4
  checklist in config-ui.md, plus:
  - The save is one `PATCH /config/main` carrying the whole built config, not a
    minimal diff. `parseMainConfig(buildConfig(loaded, values))` and send `.config`.
    PATCH, not PUT: a PUT merges over `base.json`, so a stored key the form draws no
    row for would go back to its default. A body that repeats the running values is
    not a change and `save()` returns early on it, so no-op saves do not rotate
    `main.json.bak`. Do not bring back a `changedPaths` helper (learnings.md,
    Process).
  - `POST /reload` on the backend must never leave `config` worse than it found it.
    On any failure keep the old config and change nothing. Guard the swap with a
    hand-written structural check of only the five fields the backend reads: it
    cannot use zod, its `dist` is installed standalone outside the workspace.
  - The reload reports what it could not apply, and the panel believes that over the
    static tier. `backend.port` and `backend.url` are bound at listen, and the prefix
    may have come from `API_PREFIX` rather than the config, so capture what was
    really bound in a module-level binding at listen time. Comparing the new config
    against `config.backend` after the swap compares a value to itself.
  - Three fields move tier. Once the panel calls `POST /reload`, `units.engine.ip`,
    `units.thermal.ip` and `pc.os` are applied by the save, so they leave
    `backendRestart`. Add the tier to `ApplyTier` and `applyTierLabels` and update
    the per-field table in config-ui.md with the reader that proves each row.
  - The banner cannot be component state: the save ends in
    `window.location.reload()`. It goes to `sessionStorage`, `ConfigView` reads it
    after the reload, and its content comes from the reload's answer, not the tier.
    Do not delay the panel reload to show it. In decisions.md.
  - Order and failure paths: a build or `hasErrors` failure sends nothing; a 400
    shows its `{ path, msg }` errors next to the fields, not as one blob; a failed
    reload says so in the log, sets the banner and still reloads the panel.
  - No new dependency, so the panel tests stay plain vitest with no component
    mounting. Backend tests are jest in the style already there; a route test mocks
    `index.ts` and closes its server with `closeAllConnections()`.
  - Out of scope, in P5: auth on the configer write endpoint, confirm dialogs for
    dangerous fields, the component test.
  - PR title `feat: apply a saved config without editing the file`.
- P5 — written when P4 is merged.
