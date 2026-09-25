# Dependency upgrade

Status: **P3 done, P4 open** on `feat/toolchain-jump`. `main` has no upgrade code.
Owner: —
Last updated: 2026-09-25

## Goal

Move every package in `source/` to its latest published version, and move the
boxes onto this toolchain, without breaking the unattended update path on a
single deployed babybox:

1. **Bun 1.4.2** (pinned) is the runtime and the package manager. It replaces
   Node 24 and pnpm 12. The serving apps, `vite`, `tsc`, `vitest`, `oxlint`
   and `oxfmt` run through Bun. Express stays Express. The panel stays Vite.
   Tests stay vitest. This is not a rewrite onto `Bun.serve`.
2. **Very strict TypeScript.** Every compile unit uses the flag set in
   "TypeScript contract". No `any`. No non-null assertions. No `as` except a
   tracked suppression. `tsc` 7.0.2 builds backend, configer and
   config-schema. The panel stays on TypeScript 6.0.3 because `vue-tsc` 3.3.11
   still crashes on 7.
3. **oxlint + oxfmt** replace the ESLint and Prettier family. Warnings are
   errors in CI (`oxlint --deny-warnings`, `oxfmt --check`).
4. **If a step fails**, the box records which step and the error, then starts
   the last good build. A person on site is not required.
5. **A restart is the release.** Ubuntu, Windows 10 build 17763 or newer, and
   Windows 11 install the jump on that restart. Windows 8 keeps the current
   panel and a clean git checkout. See "Safe release".

This file is the one place where the upgrade is tracked. Tick the boxes here,
record decisions in [decisions.md](../decisions.md), lessons in
[learnings.md](../learnings.md).

This plan is for the deployed `zbyju/babybox` panel computers. The
`babybox-mono` rewrite does not replace it. A box that is off for a year still
has to boot from this repo. `babybox-mono` keeps pnpm for the workspace and
uses Bun only for some apps. This fleet repo uses Bun for both the runtime and
the lockfile, because the alternative is a second Node plus a second pnpm to
bootstrap from Node 18.

## Target after the jump

| Piece | Target | Not |
|---|---|---|
| Runtime for backend, configer, panel build | Bun 1.4.2, pinned | Node 24 |
| Package manager | `bun install`, `bun.lock` | pnpm 12, npm, yarn |
| Legacy hook (boot 1, forever) | `pnpm run build` on the box's old pnpm 7 | changing autostart before the pull |
| Process manager | pm2 7.0.4, apps spawned with the absolute Bun path | replacing pm2 |
| Type-check | `tsc` / `vue-tsc`, very strict flags | `// @ts-ignore`, relaxing `strict` |
| Lint | oxlint 1.85.0 (re-check at P5) | ESLint 10 |
| Format | oxfmt 0.70.0 (re-check at P5) | Prettier 3 |
| Tests | vitest 5 | `bun test`, jest |
| Panel bundle | Vite 8 | `bun build` |
| HTTP servers | Express 5 on Bun | Elysia / `Bun.serve` |

Node 18 and pnpm 7 stay on disk as the bootstrap host and the `pnpm run build`
hook. They are not upgraded. They stop serving HTTP after P3. Node also runs
the pm2 daemon and the startup app.

## Safe release

The execution branch is `feat/toolchain-jump`. This branch is long-lived.
Rebase put it on `origin/main` `303b61e` (#100). It started at `6eb4fbf`
(#98). Do not delete the branch. Do not merge one phase into `main` by
itself.

Each topic uses its own branch and its own pull request. The base of that
pull request is `feat/toolchain-jump`. A merge of that pull request puts the
commits on the long-lived branch. The pull request from `feat/toolchain-jump`
into `main` (#102) stays open until the canary. Do not open a second pull
request into `main`.

A box updates when it restarts. The startup app runs `git pull`, then maybe
`pnpm run build`. Two arrivals must both end with a panel on screen.

1. The branch is merged to `main`. The box is still on `main`. A person
   restarts the computer. The boot pull downloads the merge. The build runs.
2. A person checks the box out onto the branch tip, then restarts the
   computer. The boot pull prints `Already up to date`. The build must still
   run on an OS that can run Bun.

Today the second arrival skips the build when `dist` already exists. P1
changes that rule.

### When the boot builds

Build when any line below is true.

- `git pull` changed the checkout.
- `dist` is missing.
- `dist/release.json` does not contain the current HEAD sha.
- The OS can run Bun and `bun -v` is not `BUN_VERSION`.
- `startup.last.json` has `ok: false` and `step` is not `OS_HOLD` or `CPU_HOLD`.

Do not build when `step` is `OS_HOLD` or `CPU_HOLD` and the OS is still in
that hold. Write `dist/release.json` only after `START_PANEL` succeeds. The
file holds the HEAD sha. It lives under `dist`, outside the git checkout.

### Hold operating systems

Bun 1.4.2 requires Windows 10 version 1809 (build 17763) or later. It does
not run on Windows 8. Parse `os.release()`. Do not search for the text
`Windows 8`.

Hold the box when the release string matches one of these.

- `6.1.` is Windows 7.
- `6.2.` is Windows 8.
- `6.3.` is Windows 8.1.
- `10.0.` with a build number below 17763 is a Windows 10 that cannot run Bun.

Windows 10 build 17763 or newer, and Windows 11 (`10.0.` with build 22000 or
newer), take the jump. Ubuntu 22.04 or newer from `install-all.sh` takes the
jump.

On a hold OS the boot does only this.

1. Do not download Bun.
2. Do not run `bun install` or `pnpm install`.
3. Do not change a lockfile.
4. Do not change the git branch.
5. Write `startup.last.json` with `step` `OS_HOLD`, `ok` true, and the OS
   release string.
6. Start the existing `dist`.
7. Leave `git status` clean.

The first boot after the pull still uses the old startup app. That app treats
a non-zero `pnpm run build` as a failed build and does not swap `dist`. The
runner exits non-zero on `OS_HOLD` and writes no stderr. The old app then
starts the existing `dist`. The next restart uses the new startup app. That
app sees `OS_HOLD` and does not call the build again. If the runner exits
non-zero and `step` is `OS_HOLD`, the new startup starts the previous `dist`.
It does not retry the new apps.

A hold box stays on its current branch. After the merge, that branch is
`main`. Each later restart can still `git pull`. The panel on screen stays
the last good build. The new toolchain does not install. A later install of
Windows 10 1809+, Windows 11, or Ubuntu 22.04+ on that computer, then a
restart, takes the jump. No git repair is required.

`git checkout legacy` is not part of this release. A branch switch on the box
is how a box stops pulling `main`. An exit code of 0 after a hold is also
rejected. The old startup would treat that as a good build and swap `dist`.

### CPU that cannot run the Bun binary

Bun 1.4.2 ships one x64 binary per OS. It needs SSE4.2 (Intel Nehalem or AMD
Bulldozer). The `*-baseline` zip is an alias of that same binary. Do not
download it as a fallback.

If the binary exits with an illegal instruction, record step `CPU_HOLD`. Keep
the last good `dist`. Do not try again until `BUN_VERSION` changes. Use the
same non-zero exit and clean tree as `OS_HOLD`.

### Where files land

Download the zip to the OS temp directory or to `~/.bun`. Do not write it
inside `source/`. `source/logs/` is gitignored. `startup.last.json` there does
not dirty the checkout. A file inside `source/` that is not ignored will block
the next `git pull`.

pm2 must start the apps with the absolute Bun path
(`$HOME/.bun/bin/bun` or `%USERPROFILE%\.bun\bin\bun.exe`). Do not rely on
`PATH`. The first boot still runs the old two-line autostart. That script
does not export `~/.bun/bin`. The runner prepends that directory for its own
child processes only.

### What may be checked out on a live box

The plan commit does not change the boot. A restart on that commit keeps the
current app. Do not restart a box on a later commit until that tip has passed
the `legacy-image` job.

The jump commit contains all of these together.

- `bootstrap.js`
- the named-step record
- the last-good `dist` swap
- `OS_HOLD` and `CPU_HOLD`
- the rule that builds when HEAD differs from `dist/release.json`
- the Bun download

Later commits on the branch may upgrade libraries. They stay off `main` until
the tip passes the job again.

If `main` gains old-toolchain commits before this branch merges, rebase
`feat/toolchain-jump` onto `main` and move the `legacy-runtime` tag to the new
base. Do not rebase after a box has checked out the tip.

### Canary before merge

Use one computer for each line. The current app is running. The network works.

1. Ubuntu 22.04 or newer.
2. Windows 10, build 17763 or newer.
3. Windows 11.
4. Windows 8.

On each computer, in `source/`:

1. Record the panel that is on screen.
2. Run `git status`. Stop if it is not clean.
3. Run `git fetch` and `git checkout feat/toolchain-jump`.
4. Restart the computer.
5. Wait until the panel is on screen.

Pass for Ubuntu, Windows 10, and Windows 11:

- The panel is the new build.
- `GET /status` shows Bun `1.4.2`.
- `git status` is clean.
- `startup.last.json` has `ok` true and the last step is `START_PANEL`.

Pass for Windows 8:

- The panel is the same build as before the restart.
- `startup.last.json` has `step` `OS_HOLD`.
- `git status` is clean.
- `git branch --show-current` is still `feat/toolchain-jump`.
- A second restart shows the same panel.

A failed canary blocks the merge.

### Rollback of a canary

The merge has not happened. `git status` is clean.

1. In `source/`, run `git checkout main`.
2. Restart the computer.

The boot builds `main`, or it starts the previous `dist` if that build fails.
The panel comes back. If `git status` is not clean, do not checkout. Start the
existing `dist` and record the dirty files.

### Merge

Merge `feat/toolchain-jump` into `main` in one merge. A box on `main` receives
the whole tip in one `git pull`. Do not put a lockfile commit on `main`
without the bootstrap in the same tip.

After the merge, do not run a command on the fleet. The next restart is the
release. A box with no network starts the existing `dist` and tries again on
the next restart.

### CI on this branch

The `legacy-image` job starts from the `legacy-runtime` tag (`303b61e`, #100).
It runs `git pull` to the branch tip and `pnpm run build`.

On the success path it asserts all of the following.

- Exit 0 on Ubuntu and on Windows 10/11.
- Empty stderr.
- A clean tree.
- `bun -v` equals `BUN_VERSION`.

A second case sets the OS release to `6.2.9200` (Windows 8). It asserts all
of the following.

- No request for the Bun zip.
- `pnpm-lock.yaml` is unchanged.
- The runner exit is non-zero.
- The previous `dist` is still the live tree.
- The git branch did not change.

A third case checks out the tip first, then starts the app, as a person would
after `git checkout`. `git pull` prints `Already up to date`. HEAD differs
from `dist/release.json`. The job asserts that the build runs.

The job gates the merge. A red job means the tip is not safe to check out on
a box. The fake Windows 8 case does not replace the real Windows 8 canary.

The `legacy-boot1` job runs the real startup app from the `legacy-runtime`
tag, with pm2 5.2.0 or 6.0.14 and no `~/.bun/bin` on `PATH`. It runs on
Ubuntu and on Windows. It first builds and starts the tag, as a legacy box
would. Then it pulls a tip with a panel build that exits 1. The legacy
`dist` must start on Bun. Then it pulls the pull request head. The new
`dist` must start on Bun. Each case checks the pm2 interpreter and the real
process executable. The old startup never puts `dist2` back after a failed
start, so this job is the only proof that boot 1 starts.

## Review 2026-09-21

Checked against `origin/main` at `6eb4fbf` (#98). Commits after the
2026-09-13 review (`#92` through `#98`) do not change `git pull` or
`pnpm run build`. They do change the panel. The P4 manual run includes the
config guard rails (#93), the title password jump (#96), the message colors
(#97), and the camera error inset (#98). Re-count the panel typecheck errors
at the start of P4. Do not keep the old count of 20.

`npm view` on 2026-09-21: Bun is still 1.4.2. TypeScript is still 7.0.2.
`vue-tsc` is still 3.3.11 and still cannot type-check on TypeScript 7.
oxlint is 1.85.0. oxfmt is 0.70.0. vitest is 5.0.1. vue is 3.5.43.
`@vitejs/plugin-vue` is 6.0.9. jsdom is 30.1.0. moment is 2.31.0. dotenv is
18.0.2. `open` is 11.0.4. The Bun install docs now say the `*-baseline` zip
is an alias of the one x64 binary. The baseline retry is removed.

## Review 2026-09-14

Owner: also move to Bun, very strict TypeScript, oxlint and oxfmt.

The jump design is unchanged. HEAD still bootstraps from the legacy runtime in
one boot, two at most. The first hook is still HEAD's root `build` script,
because today's autostart files call `pnpm run build`. What changed is the
thing that script installs: one pinned Bun binary, not Node 24 plus pnpm 12.

### Why Bun, not Node 24 + pnpm 12

- Node 18 is end of life. pnpm 7 cannot reach the registry from Node 20+. The
  2026-09-13 target solved that by installing two new tools. Bun is one zip,
  one `PATH` entry, one version pin.
- `n` / nvm-windows for Node 24 needs a writable `/usr/local` or a UAC prompt.
  The Bun zip extracts under the user profile. No `nvm use`.
- Vite 8, vitest 5, jsdom 30, oxlint and oxfmt refuse Node 18. They run under
  Bun 1.4.2. oxfmt's worker bug with Bun is fixed as of Bun 1.3.11.
- `bun --watch` replaces `tsx` + `nodemon`. One less JS API that TypeScript 7
  would break.
- A format-9 `pnpm-lock.yaml` is still how a box dies. P2 adds `bun.lock` and
  stops calling `pnpm install`. The old lockfile 5.4 file stays in the tree
  until P7 so an accidental `pnpm install` from pnpm 7 cannot rewrite it.

Rejected: keep the 2026-09-13 Node 24 + pnpm 12.4.1 target. Rejected: follow
`babybox-mono`'s pnpm 10 workspace and only use Bun for new services.

### Still true from 2026-09-13

- A box never sees phases. A fleet gate cannot be relied on.
- `pnpm-lock.yaml` is lockfile 5.4. pnpm 7 that meets format 9 rewrites it.
- Backend ESM, Express 5, vitest everywhere, Vite 8, panel on TypeScript
  6.0.3 because `vue-tsc` 3.3.11 still crashes on 7.0.2.
- A failed step must name itself and keep the error. The last good `dist`
  must start. See "When an upgrade fails".
- Windows 8 cannot run Bun 1.4.2. Do not `git checkout` another branch.
  Keep the current panel. See "Safe release". Supersedes the 2026-09-14
  `legacy` park.

## Review 2026-09-13

Checked against `origin/main` at `cee4df0` (#91) and against npm on this date.
The jump design is still the whole plan. What changed that day is the
inventory, a few checkboxes, and one unmerged branch that must not be
mistaken for P1. The 2026-09-13 target runtime (Node 24 LTS 24.21.0 and pnpm
12.4.1) is superseded by the 2026-09-14 Bun target above.

### Still the core

- Node 18 is end of life. pnpm 7.5.0 still cannot reach the registry from
  Node 20+. Vite 7+, Vitest 4+, ESLint 10, jsdom 21+, oxlint and oxfmt still
  refuse Node 18. Bun is how those tools run after the jump.
- A box never sees phases. HEAD must bootstrap the runtime from the legacy
  Node and pnpm, in one boot, two at most. A fleet gate cannot be relied on.
- The first-jump hook is still HEAD's root `build` script. Today's autostart
  files are two lines: they run the Node startup app, and that app is what
  calls `git pull` then `pnpm run build`. The new `startup.sh` cannot run
  until the boot after that pull.
- `pnpm-lock.yaml` is still lockfile 5.4. pnpm 7 that meets format 9 rewrites
  it and the dirty tree blocks every later pull.
- Backend ESM, Express 5, oxlint + oxfmt, vitest everywhere, Vite 8, panel on
  TypeScript 6.0.3 because `vue-tsc` 3.3.11 still crashes on 7.0.2.
- A failed step must name itself and keep the error. The box must then start
  the last good `dist`. Today's path does not keep that promise. See
  "When an upgrade fails".

### Changed on main since 2026-09-12

| Change | PRs | What it does to this plan |
|---|---|---|
| `@babybox/config-schema` with `zod@3.23.8` | #86 | New package in the inventory. Already `module: node16` and `strict: true`. Backend imports the type only, through `baseUrl` + `paths`, because a `workspace:*` dep breaks the standalone `dist` install (learnings.md, Startup). TS 7 removes `baseUrl`; P4 must replace that path with a relative `paths` entry. Zod stays on 3.23.8 in this plan. Zod 4 is a separate project. |
| Config write path, PATCH, panel config page, apply-on-save | #85 #88 #89 #91 | Manual run in P4 includes the config page, PUT and PATCH. Express 5 now has 11 async route handlers (7 backend, 4 configer), not 9. Empty-body tests exist for PUT and PATCH; they still assume Express 4's `req.body = {}` when the header is missing. |
| Startup logs through pino, not winston | #90 | Startup depends on `pino@^8.21.0` and `pino-pretty@^10.3.1`, with a fallback when `require("pino")` fails so a boot after a failed install still runs. `bootstrap.js` stays dependency-free. Do not upgrade pino until Bun is the runtime (P4). The Czech one-line file format from #90 is a constraint, not a nice-to-have. |
| Startup has tests | #90 | `apps/startup/src/logger.test.js` runs under jest. P0 must not remove jest from startup. P5 moves those tests to vitest and puts them in CI. CI today lints startup and does not test it. |
| `installAll.sh` removed | #54 | Ubuntu provisioning is `install-all.sh` only. Both `install-all.sh` and the old script used `n` and chowned `/usr/local`. |
| Panel no longer imports axios | #76 | `axios` is still in `apps/panel/package.json` and the leftover `apps/panel/pnpm-lock.yaml`. Dead weight for P0. Backend still has one axios call site. |
| Panel lodash is deep imports | #71 | `lodash/isEqual`, `cloneDeep`, `throttle`. Lodash 4.18.1 is still the bump. |
| CI already matches the box | #77 | Node 18.12.1, pnpm 7.5.0, `pnpm install --frozen-lockfile`, lint, `build:schema`, panel/backend/configer build, tests. A comment claims `versions.env` exists. The file is not on `main`. No Bun job. No legacy-image job. |
| `decisions.md` and `learnings.md` exist | #85 | The 2026-09-12, 2026-09-14, and 2026-09-21 upgrade decisions are in `decisions.md`. Panel typecheck is 20 errors, not 17, measured at 1927135; #89 and #91 landed after, so re-count at the start of P4. |
| GET `/status` exists | #80 | Backend and configer both return `{ msg: "Alive." }`. P0/P1 extend those bodies. They do not add new routes. |
| Root `build` already builds the schema | #86 | `"build": "pnpm install && pnpm run build:schema && …"`. `bootstrap.js` still goes in front of `pnpm install` in P1. P2 changes that step to `bun install`. |

### Dropped or corrected

- "jest in startup is declared but there are no tests; remove" — false. Keep
  jest until P5.
- "installAll.sh (old) and install-all.sh (new)" as two living scripts — only
  `install-all.sh` remains.
- "17 panel typecheck errors" — 20 at 1927135, and the bar is no new errors.
- "Add GET `/status`" — extend the existing route.
- "9 async Express handlers" — 11, after PATCH.
- "configer uses the root TypeScript and has nothing to change" — still true
  for configer sources; config-schema is a fourth compile unit and the backend
  `baseUrl` is a new TS 7 problem.
- The 2026-09-11 decision that the backend stays on jest is superseded by the
  2026-09-12 decision to move it to vitest. That is already in "Decisions
  taken".

### Unmerged work that is not P1

`claude/update-project-dependencies-dce7cd` (`7e174f1`) pins the current
versions in place and moves version checks into `startup.sh` / `startup.bat`:
pull first, then `versions.env`, then `n` / `npm install -g`, then Node.

Reuse from it:

- The `versions.env` format and comments. Add `BUN_VERSION` and the zip
  sha256 keys. Keep `NODE_VERSION` and `PNPM_VERSION` as the legacy values
  we detect, not as upgrade targets.
- `install-all.sh` reading those values instead of five hard-coded copies.
  New Ubuntu boxes install Bun from the same pin.
- Pinning pm2 to an exact version, not `@latest`.
- `tests/startup.test.sh` for the shell branches.
- Dropping global `typescript` and `ts-node` from the install scripts.

Do not treat it as the jump:

- Today's autostart is still the two-line script. The first boot after a
  format-9 lockfile still runs HEAD's `pnpm run build` under pnpm 7. Pull-first
  in `startup.sh` only helps the boot after that script is already on disk.
  That is the fleet gate this plan rejected.
- `deps_ok` probes `winston`. Startup now uses `pino`.
- The branch pins every package to the old exact version. This plan upgrades.
- It is many commits behind `main` (#85–#91, pino, config-schema).

P1 therefore ships both mechanisms: `bootstrap.js` at the front of `build`
(the first jump, which downloads Bun), and the shell `ensure_bun` /
`ensure_pm2` functions (every later boot, and the two-boot fallback). Both
read `versions.env`. Do not harvest `ensure_node` as the jump.

## Why now

- Node 18 reached end of life on 2025-04-30. No security fixes since. After
  the jump the HTTP apps run on Bun. Node 18 stays only as the bootstrap host.
- Most of the toolchain we are behind on now refuses Node 18: Vite 7+, Vitest 4+,
  ESLint 10, jsdom 21+, oxlint, oxfmt. Bun 1.4.2 runs them.
- pnpm 7.5.0 cannot reach the registry from Node 20+, so every developer machine
  already needs a workaround to install. `bun install` is the replacement.
- The panel typecheck is red with 20 pre-existing errors (last counted at
  1927135) and the build's type gate checks zero files. Newer `vue-tsc` and
  `@vue/tsconfig` plus the TypeScript contract are how that gets fixed.
- ESLint 10 is a flat-config rewrite. oxlint and oxfmt are the decided lint
  and format stack. They need a runtime newer than 18. Bun supplies it.

## What exists today

### Runtime and package manager

| Piece | Today | Pinned where |
|---|---|---|
| Node on Ubuntu boxes (half the fleet) | 18.12.1 via `n`, `/usr/local` chowned to the user | `install-all.sh` (`NODE_VERSION`), `.github/workflows/ci.yml`, and `apps/startup/versions.env` (`NODE_VERSION`, detect-only). Stays as the bootstrap host. Not upgraded. |
| Node on Windows boxes (other half) | installed by hand with nvm-windows, "mimicking" 18.12.1; OS is Windows 7, 8, 10 or 11 | nowhere; `install.bat` only checks `node -v`. Stays as the bootstrap host on Windows 10/11. |
| pnpm | 7.5.0, lockfile `5.4` | `install-all.sh`, `install.sh`, `install.bat`, `src/logic/install/{ubuntu,windows}.js`, root `packageManager`, `ci.yml`. Stays as the `pnpm run build` hook. Not upgraded. |
| Bun | absent | `apps/startup/versions.env` (`BUN_VERSION` 1.4.2 and the two x64 zip sha256 values). P1 installs the zip. |
| pm2 | `@latest` at install time | `src/logic/install/*.js`. `apps/startup/versions.env` stores `PM2_VERSION` 7.0.4. Nothing reads that pin until P1. |
| Global `typescript`, `ts-node` | not installed by the scripts | Removed from `src/logic/install/*.js` in P0. The workspace `tsc` is what the build uses. |
| TypeScript in the workspace | `^4.7.4` (root, panel, backend); configer and config-schema use the workspace `tsc` | each `package.json` that lists it |

### How a box updates

On every boot the desktop autostart runs `apps/startup/scripts/ubuntu/startup.sh`
(two lines: `cd` into startup, `pnpm run start --ubuntu`) or the Windows
`startup.bat` (`cd ../../`, `pnpm run start`). That is `node src/index.js`
**from the git checkout**. That process (`src/logic/start/ubuntu.js`) does:

1. `git pull` in `source/`. A non-zero exit or empty stdout counts as failure.
   Stderr on a pull that exits 0 does not fail the pull.
2. If the pull changed something, or `dist` is missing: `pnpm run build` in
   `source/`. That runs the
   `build` script from **HEAD's** root `package.json`: `pnpm install &&
   build:schema && build panel && build backend && build configer`. Any stderr
   fails the build.
3. On success: rename `dist` to `dist2`, copy the new build into `dist`,
   `pnpm install` inside `dist`, restart both apps under pm2.
4. On a failed **build**: leave `dist` in place and start it. On a failed
   **copy**: try to rename `dist2` back. On a failed **start**: retry the
   **new** apps five times and never restore `dist2`. That last case is a
   dead box that compiled.

Four consequences decide the shape of this plan:

- **Any stderr from `pnpm run build` fails the update.** A deprecation warning printed
  by pnpm or a package script is enough.
- **The startup app itself is always at HEAD on the boot after a pull**, even when the
  build failed, because it runs from the checkout, not from `dist`. Its
  `node_modules` may still be the old ones, though. #90's `loadPino()` fallback
  exists for that gap. `bootstrap.js` must not depend on the same luck.
- **HEAD's root `build` script runs under the box's old pnpm and old Node.** It is the
  one hook a legacy box gives us before anything else happens.
- **A dirty working tree blocks every future pull.** pnpm 7 that meets a lockfile it
  cannot read (format 9) ignores it and rewrites `pnpm-lock.yaml` in its own format.
  The next `git pull` then fails with "local changes would be overwritten", forever,
  and the box never sees a newer startup app either. This is the one way a box stops
  updating for good; the panel keeps running the old build.
- **A checkout done before the restart skips the build.** `git pull` then prints
  `Already up to date`. `dist` exists, so today's startup does not call
  `pnpm run build`. It starts the old `dist`. `start:main` runs
  `pm2 start ../dist/index.js`. The new source sits on disk and does not run.
  P1 builds when `dist/release.json` does not match HEAD. See "Safe release".

The startup app cannot upgrade Node or pnpm today.

### When an upgrade fails

Two rules, both required, for every phase from P1 on. A box that cannot name
the failed step, or that cannot start the last good panel, is a person-on-site
event (motto 2). The jump makes more steps that can fail, so the current path
is not enough.

**Previous version means the last good `dist`.** Not a `git reset`. HEAD stays
where the pull left it, so the next boot retries the upgrade. The running
panel, backend and configer come from `dist` / `dist2`. This plan does not
change the git branch on the box.

**Do not revert Bun, Node or pnpm on failure.** A half-finished bootstrap may
leave Bun on PATH with the old Node still present. The last good `dist` must
still start on whatever interpreter is now. Reverting the toolchain is a
second failure mode. Old compiled `dist` on new Bun is the expected state
after P3.

#### What today does not do

- **Which step.** `pnpm run build` is one blob: install, schema, panel,
  backend, configer. A failure is one Czech line, "Sestavení aplikace se
  nezdařilo," plus truncated stdio. `GET /status` still returns
  `{ msg: "Alive." }`. A remote reader cannot tell PULL from BUILD_PANEL from
  BOOTSTRAP_PNPM.
- **Start failure.** After a successful swap, `startConfiger` / `start` retry
  the new processes only. `override()`'s return value is ignored. `dist2` is
  left behind.
- **Configer vs panel.** A configer start failure retries only `start()` (the
  panel). Configer stays down.
- **Rollback install path.** The copy uses `cwd: "../../../dist"`. The
  rollback `pnpm install` uses `cwd: "../../dist"`. One of those is wrong.
- **No last-good until swap is proven.** `dist` is renamed to `dist2` before
  the new copy and `pnpm install` finish. A crash in that window leaves
  neither tree complete.

#### Contract

1. **Named steps**, a closed set, one in flight:

   `PULL`, `BOOTSTRAP_BUN`, `BOOTSTRAP_PM2`, `INSTALL`,
   `BUILD_SCHEMA`, `BUILD_PANEL`, `BUILD_BACKEND`, `BUILD_CONFIGER`,
   `DIST_PREPARE`, `SWAP`, `START_CONFIGER`, `START_PANEL`,
   `OS_HOLD`, `CPU_HOLD`.

   There is no `BOOTSTRAP_NODE` and no `BOOTSTRAP_PNPM`. Those tools stay at
   the legacy versions. Root `build` becomes a small runner
   (`apps/startup/run-update.js` or the same job inside `bootstrap.js`) that
   executes those build steps one by one. The legacy startup still calls
   `pnpm run build`. Each step logs start and end. A failure stops the chain.

2. **The error stays with the step.** On failure write one record to
   `source/logs/startup.last.json` (next to `startup.log`) and one Czech
   one-line to `startup.log` in the #90 format. The record holds: `step`,
   `ok`, `message` (the command's stderr/stdout, collapsed, max 2000 chars,
   same cap as the logger), `at`, `node`, `pnpm`, `bun`. No stack dump of
   `node_modules`. `GET /status` on configer and the backend include this
   record. A success writes `ok: true` and the last step that ran, so a later
   boot does not keep a stale failure.

3. **Last good `dist` stays intact until the new apps start.** Build into the
   app `dist` folders and assemble `dist-next` (copy + `bun install --omit
   dev` there, `pnpm install` only before P2). Do not rename the live `dist`
   until `dist-next` is complete. Then stop pm2,
   swap (`dist` → `dist2`, `dist-next` → `dist`), start configer, start
   panel. If either start fails: swap back, start both from the restored
   `dist`, record `START_CONFIGER` or `START_PANEL` with the error. If any
   step before the swap fails: do not touch live `dist`, start it, record the
   failed step. If there is no previous `dist` (first install), stop and
   leave the record. There is nothing to restore.

4. **The box is up.** After (3), both pm2 processes are running on either the
   new build or the last good one. A failed upgrade is a logged retry next
   boot, not a black screen.

Falsifier: the legacy-image job. A forced failure at `BUILD_PANEL` (and a
separate case at `START_PANEL` after a good build) must exit the runner with
a last-result file for that step, a clean live `dist` that is the previous
build, and both apps startable from it.

### Upgrading from any older version

A box never sees phases. It sees HEAD, whenever it next has power and network. Boxes
have been off for months and in some cases years, so **any commit on `main` must be
reachable from the legacy runtime (Node 18.12.1 or older, pnpm 7.5.0, lockfile 5.4,
old startup app, old `node_modules`) in one boot, two at most, and the bootstrap
stays in HEAD indefinitely.** A fleet-wide gate ("ship P3 once every box reports P1")
cannot be relied on; the box that was unplugged during P1 comes back straight into P6.

There are only two runtime states, legacy and new. Everything after the runtime jump
is ordinary code, so the whole problem is: HEAD must carry its own bootstrap from
legacy, and keep carrying it until the last box is known to have made the jump.

Two mechanisms, both in HEAD, both required:

1. **Bootstrap inside the root `build` script.** `"build": "node
   apps/startup/run-update.js"`. That runner calls `bootstrap.js`, then
   install, then each package build as its own named step. The legacy
   startup still runs `pnpm run build` on boot one, before pnpm 7 ever touches
   the lockfile. `bootstrap.js` compares `bun -v` and `pm2 -v` with
   `versions.env`. It does not install Node 24 or pnpm 12. For Bun it
   downloads the pinned GitHub release zip with Node's `https` (no
   `curl | bash`), checks the sha256, extracts under the user profile
   (`$HOME/.bun/bin` or `%USERPROFILE%\.bun\bin`), and prepends that
   directory to `PATH` for the rest of the runner. The zip is `bun-linux-x64`
   or `bun-windows-x64` only. An illegal instruction is `CPU_HOLD`, not a
   second download. Exit 0 when Bun already matches and the OS is not on hold.
   A hold exits non-zero before any download. After P2 the install that
   follows is `bun`
   install` in a fresh process; `vite build` and `tsc` run through `bun
   run`. One boot. A failed step writes `startup.last.json` and the runner
   exits non-zero without touching live `dist`.
2. **The new startup app as fallback, plus shell `ensure_bun`.** If the
   bootstrap could not run (bad permissions, no network for GitHub
   releases), the build fails, the last good `dist` starts (see "When an
   upgrade fails"), and on the next boot HEAD's `startup.sh` / `startup.bat`
   and the Node startup app run on the old Node with the old `node_modules`.
   They repeat the bootstrap with better logging and a `git checkout --
   pnpm-lock.yaml` before the pull, so a dirtied tree self-heals. Two boots.
   The shell functions are a Bun-shaped harvest of the unmerged pinning
   branch. They do not replace (1).

### Windows boxes

Half the fleet. Facts that shape the bootstrap there:

- **Bun needs Windows 10 version 1809 (build 17763) or later.** Windows 7,
  Windows 8, Windows 8.1, and Windows 10 builds below 17763 cannot run it.
  Those boxes also cannot run Node 18+. They stay on the last good `dist`.
  See "Safe release". Confidence high on the support matrix, medium on what
  they actually run. The `GET /status` fields from P1 will tell.
- **The Bun zip extracts under the user profile.** No `nvm use`, no Program
  Files symlink, no global npm after a Node switch. That removes the UAC
  prompt that Node 24 would have needed. Tested 2026-09-23 on one Windows
  box. The logged-in user wrote `%USERPROFILE%\.bun` at Medium integrity
  with no UAC prompt. That account was `juricj`. The usual fleet account
  name is `babybox`. The path is the profile of whoever is logged in.
- **nvm-windows stays as the leftover Node host.** The jump does not call
  `nvm use`. The pm2 daemon stays on that Node (decided 2026-09-25). Only
  the app interpreter changes in P3.

What the bootstrap does on Windows:

1. Windows 10 build 17763 or newer, and Windows 11: download the pinned
   `bun-windows-x64` zip, extract to `%USERPROFILE%\.bun\bin`, and pass the
   absolute `bun.exe` path to later steps. Do not call `nvm use`. Same
   contract as Ubuntu.
2. Windows 7, Windows 8, Windows 8.1, and Windows 10 below build 17763:
   `OS_HOLD`. Do not download Bun. Do not change the branch. Exit non-zero
   so the old startup does not swap `dist`. The next restart sees `OS_HOLD`
   and starts the existing panel. A new OS on that computer, then a restart,
   takes the jump.

Rules that follow, and hold until the last legacy box is gone:

- `bootstrap.js` and everything in `apps/startup/src` run on the **oldest Node in the
  field**, not on Node 18. Until the inventory says otherwise, assume Node 12: no `??`
  or `?.`, no `fs/promises` import, CommonJS. They use **no dependency** that is not
  already in a legacy `node_modules`. Today that set is `fs-extra` 10, `moment`,
  `pino` 8, `pino-pretty` 10, `sudo-prompt` 9 — and pino is loaded through a
  try/catch because a failed `pnpm install` leaves it missing. `bootstrap.js`
  itself uses nothing. New syntax and new packages are for the other apps.
- The `legacy-runtime` tag is never deleted. The offline tail is years.
  There is no `legacy` branch in this release.
- `bootstrap.js` writes only to stdout and a log file. The zip download and
  unzip both chat on stderr; redirect it. Stderr fails the build.
- `bootstrap.js` is idempotent and fast when nothing differs; it runs on every update.
- `.npmrc` gets `frozen-lockfile=true`, so a pnpm that cannot read the lockfile
  errors out instead of rewriting it. Fail loud, stay clean. Today `.npmrc` only
  has `link-workspace-packages = true`. The old lockfile 5.4 file stays until P7.
- **CI proves the jump on every PR**, not a person on a spare box. A container with
  Node 18.12.1, pnpm 7.5.0 and a checkout of the tagged legacy commit runs the same
  two commands the legacy startup runs, `git pull` to the PR head and `pnpm run
  build`, and asserts: exit 0, empty stderr, clean tree, `bun -v` equal to
  `BUN_VERSION` (after P1), `pnpm-lock.yaml` still clean. Windows gets the same
  check on a `windows-latest` runner for the Windows 10/11 path. The Windows 8
  path is tested by faking `os.release()` as `6.2.9200` and asserting
  `OS_HOLD`: non-zero exit, no branch change, no zip request, previous `dist`
  still live. A third case starts after the tip is already checked out and
  asserts the build still runs. See "Safe release".

Falsifier: the legacy-image job. If it fails, HEAD is not installable from a legacy
box and the PR does not merge.

### Packages: current → latest

Versions from `npm view` on 2026-09-21. "Node" is the package's own `engines.node`.
Numbers that did not move since 2026-09-13 are left as they were. Re-check at
the start of P4 and P5. The Latest column is the exact specifier to write in
`package.json`. Write `1.2.3`. Do not write `^1.2.3`, `~1.2.3`, `*`, or
`latest`.

**Root (`source/package.json`)**

| Package | Now | Latest | Node | Note |
|---|---|---|---|---|
| typescript | ^4.7.4 | 7.0.2 | ≥16.20 | native compiler; see P6 |
| ts-node | ^10.9.1 | 10.9.2 | — | remove. `bun --watch` replaces ts-node, tsx and nodemon |
| @types/node | ^18.11.18 | 24.13.4 | — | bun's Node compat layer. npm's absolute latest is 26.5.1; do not follow it. The type-contract PR kept 18.x in the backend and configer, and added no `@types/bun`: their `dist` can still start on Node 18. Owner to confirm, see "Open questions". |
| @types/cors, @types/express, @types/lodash.merge | | | | move to the apps that use them; root should hold nothing |

**`@babybox/config-schema`** (new since the first draft)

| Package | Now | Latest | Node | Note |
|---|---|---|---|---|
| zod | 3.23.8 (exact) | 4.6.5; latest 3.x is 3.25.76 | — | Pinned because 3.23.8 is the last 3.x before 3.25 started shipping v4 next to v3, and it compiles on TypeScript 4.7. **Stay on 3.23.8 in this plan.** Zod 4 rewrites the error API the schema already wraps. Out of scope. |
| vitest | ^0.9.3 | 5.0.1 | ^22.12 ‖ ^24 | with the rest in P5 |
| typescript | none (uses workspace `tsc`) | 7.0.2 | | already `module`/`moduleResolution: node16`, `strict: true`, `"types": []`. P6 can swap the binary. |

**Panel**

| Package | Now | Latest | Node | Note |
|---|---|---|---|---|
| vue | ^3.2.33 | 3.5.43 | — | minor line, low risk |
| vue-router | ^4.0.14 | 5.3.1 | — | v5 has no breaking change for us (no file-based routing); v6 will be ESM-only |
| pinia | ^2.0.13 | 4.0.3 | — | stores already use `defineStore("id", {…})`, which v3 kept. v4 is ESM-only and needs `@vue/devtools-api`, TS ≥5.6, vue ≥3.5.11. Vite bundles it. |
| axios | removed | — | | Removed in P0. It was unused in panel `src/` (PR #76). |
| howler | ^2.2.3 | 2.2.4 | — | last release 2023-09; works |
| lodash | ^4.17.21 | 4.18.1 | — | three deep imports (`isEqual`, `cloneDeep`, `throttle`) |
| moment | ^2.29.3 | 2.31.0 | — | project is in maintenance mode; 17 call sites; replacing it is out of scope |
| vite | ^2.9.5 | 8.3.0 | ^20.19 ‖ ≥22.12 | six majors; v8 is Rolldown-based, fallback is 7.3.6 |
| @vitejs/plugin-vue | ^2.3.1 | 6.0.9 | ^20.19 ‖ ≥22.12 | |
| vitest | ^0.9.3 | 5.0.1 | ^22.12 ‖ ^24 ‖ ≥26 | |
| jsdom | ^16.7.0 | 30.1.0 | ^22.22.2 ‖ ^24.15 ‖ ≥26 | the strictest Node floor in the repo. P5 proves `bun install` accepts this engine. |
| vue-tsc | ^0.38.2 | 3.3.11 | — | needs TS ≥5.0 **JS API**; not the TS 7 binary. Still 3.3.11. In the panel since the panel contract PR. Needs Node 16 or newer to run (fails on 14.21.3). |
| @vue/tsconfig | ^0.1.3 | 0.9.1 | — | needs TS ≥5.8. Its vue ^3.4 peer is optional: 0.9.1 works with vue 3.2.37 (panel contract PR). 0.1.3 used `moduleResolution: Node` and `preserveValueImports`, both removed in TS 7 |
| @vue/reactivity | none | 3.2.37 | — | added in the panel contract PR, types only. `vitest.env.d.ts` declares the chai bail type on it. Bump with vue. |
| stylus | ^0.57.0 | 0.64.0 | ≥16 | 31 SFC style blocks |
| eslint | ^8.19.0 | 10.11.0 | ^20.19 ‖ ^22.13 ‖ ≥24 | flat config rewrite; see "Lint stack". Removed, not upgraded. |
| @typescript-eslint/* | ^5.30.5 | 8.70.0 | ≥18.18 | peer `typescript <6.1` |
| eslint-plugin-vue | ^9.1.1 | 10.11.0 | ≥18.18 | |
| @vue/eslint-config-typescript | ^11.0.0 | 14.9.0 | ≥18.18 | needs eslint ≥9.10 |
| @vue/eslint-config-prettier | ^7.0.0 | 10.2.0 | — | |
| eslint-plugin-prettier | ^4.2.1 | 5.5.6 | — | |
| eslint-plugin-simple-import-sort | ^7.0.0 | 14.0.0 | — | |
| eslint-plugin-unused-imports | ^2.0.0 | 4.4.1 | — | |
| @rushstack/eslint-patch | ^1.1.4 | 1.16.1 | — | not needed with flat config; remove |
| prettier | ^2.7.1 | 3.9.6 | ≥14 | |
| @types/jsdom, @types/howler, @types/lodash, @types/node | | 30.0.0, 2.2.13, 4.17.25, 24.13.4 | | The panel contract PR removed `@types/jsdom` (nothing imports jsdom) and moved the panel `@types/node` to 18.11.18, the root and configer pin. Only the tests and `vite.config.ts` load it. |
| `apps/panel/pnpm-lock.yaml` | stale, format 5.4 | — | | leftover from before the workspace; delete |

**Backend**

| Package | Now | Latest | Node | Note |
|---|---|---|---|---|
| express | ^4.18.1 | 5.2.1 | ≥18 | see "Express 5" below |
| cors | ^2.8.5 | 2.8.6 | — | |
| dotenv | ^16.0.1 | 18.0.2 | ≥12 | 18 is a major bump. Re-check the load banner before P4. Silence it or it lands on stdout. |
| lowdb | removed | — | | Removed in P0. No import in the backend. |
| moment | ^2.29.3 | 2.31.0 | — | |
| morgan | ^1.10.0 | 1.12.1 | — | |
| open | ^8.4.0 | 11.0.4 | ≥20 | ESM-only since v9; backend is CommonJS; see "ESM-only packages" |
| winston | ^3.8.1 | 3.19.0 | — | one file: `modules/restart.ts` |
| axios | ^0.27.2 | 1.20.0 | — | one call site, `fetch/fetch.ts` |
| jest, @types/jest | ^28.1.3 | 30.5.1, 30.0.0 | ≥18.14 | ten test files; moved to vitest 0.9.4 in the type-contract PR |
| ts-jest | ^28.0.7 | 29.4.12 | — | peer `typescript <7` |
| newman | ^5.3.2 | 6.2.2 | ≥16 | |
| nodemon | ^2.0.19 | 3.1.14 | ≥10 | |
| @types/express, @types/cors, @types/morgan | | 5.0.6, 2.8.19, 1.9.10 | | `@types/express@5` for express 5 |
| @babybox/config-schema | tsconfig `paths` only | — | | must stay a type-only import. No `workspace:*` in this `package.json`. |

**Configer**

| Package | Now | Latest | Node | Note |
|---|---|---|---|---|
| express, cors, dotenv | as backend | as backend | | |
| lowdb | 3.0.0 | 7.0.1 | ≥18 | `versions.json` only. The unused `index.ts` import was removed in P0. |
| lodash.merge, @types/lodash.merge | ^4.6.2, ^4.6.7 | 4.6.2, 4.6.9 | — | |
| vitest | ^0.9.3 | 5.0.1 | ^22.12 ‖ ^24 | |
| @babybox/config-schema | workspace:* | — | | built to `dist/` first; Node 18 cannot load `.ts` |

**Startup** (plain CommonJS JavaScript)

| Package | Now | Latest | Node | Note |
|---|---|---|---|---|
| fs-extra | ^10.1.0 | 11.4.0 | ≥14.14 | |
| moment | ^2.29.3 | 2.31.0 | — | |
| pino | ^8.21.0 | 10.3.1 | — | loaded through try/catch. Upgrade in P4 after Bun is the runtime. Keep the Czech one-line file + rotation from #90. |
| pino-pretty | ^10.3.1 | 13.1.3 | — | with pino |
| sudo-prompt | ^9.2.1 | 9.2.1 | — | last release 2024-12; no upgrade exists; still needed for Windows elevation |
| eslint, eslint-config-prettier, plugins, prettier | as backend | as backend | | removed in P5 |
| jest | ^28.1.3 | — | | **in use** (`logger.test.js`). Move to vitest in P5. Do not remove in P0. |

**Global on the boxes**

| Tool | Now | Target | Node | Note |
|---|---|---|---|---|
| Bun | absent | 1.4.2 pinned | | Runtime and package manager. GitHub release zip, sha256 in `versions.env`. One x64 binary. SSE4.2 required. No baseline fallback. |
| Node | 18.12.1 | leave in place | | Bootstrap host and `pnpm run build` hook. Not upgraded. Stops serving HTTP after P3. |
| pnpm | 7.5.0 | leave in place | ≥18 | Legacy `pnpm run build` only. Lockfile 5.4 stays until P7. Not upgraded. |
| pm2 | `latest` | 7.0.4 | ≥18 | 7.0.4 from `versions.env` (startup.sh, startup.bat, both install scripts). A box keeps its old pm2 until boot 2. P3 spawns apps with the absolute Bun path. |
| typescript, ts-node (global) | removed from the install scripts | — | | P0. Workspace `typescript` and `ts-node` stay until later phases. |

## Things that change behaviour, not just versions

**Express 5.** The 11 async route handlers in backend and configer today reject into
nowhere when they throw; Express 5 forwards a rejected promise to the error
middleware, so we need one and it must return JSON, not the HTML default page.
`req.body` is no longer pre-set to `{}` when no parser matched — configer's
"empty body is rejected" rule (decisions.md, 2026-09-11) then sees `undefined`.
The non-object check covers it. The existing tests (`main.test.ts` empty body,
`configRoute.test.ts` missing Content-Type) still assume `{}`; extend them so
both `{}` and `undefined` return 400 and write nothing. Route strings with
`*`, `?`, `+` or regex parts changed syntax; we have none (`["/version", "/versions"]`
arrays are fine). `req.query` is a getter now; nothing assigns to it.

**ESM-only packages.** `open` (≥9), `pinia` (4), `lowdb` (≥4), and Vue Router 6
later. The panel is bundled by Vite, so ESM-only is invisible there. Configer and
config-schema are already ESM. The backend is CommonJS with `import x = require("open")`.
**Decided 2026-09-12: convert the backend to ESM**, the same shape as configer:
`"type": "module"`, `module`/`moduleResolution: node16`, `.js` on relative import
specifiers, `path.dirname(fileURLToPath(import.meta.url))` for `__dirname`, plain
`import` for `open`, `moment`, `winston`. Not `import.meta.dirname`: it needs Node
20.11, and the Node 18 fallback from P3 can start the new `dist`.
`dist/package.json` is a copy of the backend's, so pm2 sees
`"type": "module"` too. Jest is the only CommonJS-shaped tool in the backend and
goes in the same phase. The config-schema `paths` entry must keep working as a
type-only import after the move.

**TypeScript 6 and 7.** 6.0 is the last JS-based release and exists to flag what 7
removes. Removed in 7, and present in this repo: `baseUrl` (panel `tsconfig.app.json`
and now the backend tsconfig, for `@babybox/config-schema`; use relative `paths`
without `baseUrl`), `moduleResolution: node10` (`@vue/tsconfig` 0.1.3 sets `Node`;
in TypeScript 6 `module: CommonJS` with no `moduleResolution` resolves as `Bundler`,
not `node10`), and
`preserveValueImports` / `importsNotUsedAsValues` (from `@vue/tsconfig` 0.1.3;
0.9 uses `verbatimModuleSyntax`). Also changed defaults in 6: `strict: true`,
`module: esnext`, `target: es2025`, `noUncheckedSideEffectImports: true`; the backend
has `noImplicitAny` only and would become fully strict — that is wanted, and
the extra flags in "TypeScript contract" go on at the same time. `import x =
require()` and `enum` are not deprecated. `tsc --build` and project
references still work.

Found in the type-contract PR on TypeScript 6.0.3. A deprecated option is an
error, not a warning: `baseUrl` is TS5101 and `moduleResolution: node10` is
TS5107. The PR needs no `ignoreDeprecations`. An emit with `outDir` and no
`rootDir` fails with TS5011, so all three units set `rootDir`. TypeScript 6
loads no `@types` package by itself, so each unit names what it needs in
`types`. `tsc --build` writes `tsconfig.tsbuildinfo` and skips a project it
thinks is up to date, so the backend builds with plain `tsc`.

**TypeScript 7 has no stable JS API.** The `typescript@7` package is a 2.5 MB
launcher for a Go binary. Everything that today loads TypeScript as a library keeps
needing a 6.x: `vue-tsc` (Volar), `ts-jest` (peer `<7`), `ts-node`,
`@typescript-eslint/parser` (peer `<6.1`), vitest typecheck mode. **Tested
2026-09-12: `vue-tsc@3.3.11` crashes on `typescript@7.0.2`**
(`ERR_PACKAGE_PATH_NOT_EXPORTED` while resolving `tsc`) and works on `6.0.3`.
Re-checked 2026-09-13: `vue-tsc` latest is still 3.3.11. So the latest tooling that
can type-check `.vue` files is `vue-tsc` 3.3.11 on TypeScript 6.0.3; there is no
newer combination to pick. "TypeScript 7 everywhere it runs" therefore means: `tsc`
builds of backend, configer and config-schema on 7; dev runners on `bun --watch`
(needs no TS JS API); tests on vitest (transforms with esbuild/oxc, no TS needed);
the panel keeps `typescript@6.0.3` as its own devDependency. Bun workspaces give
each app its own `typescript`, so this is a per-`package.json` choice. Re-test
`vue-tsc` on 7 at each Volar major; move the panel when it passes.
`vue-tsc` also needs Node itself. Under the Bun runtime it loads no `.vue`
file and fails with TS2307 (checked in the panel contract PR).

**TypeScript contract. Decided 2026-09-14: very strict, every compile unit.**
`strict: true` is the floor, not the goal. Every `tsconfig` (backend, configer,
config-schema, panel) also sets:

- `noUncheckedIndexedAccess`
- `exactOptionalPropertyTypes`
- `noImplicitOverride`
- `noPropertyAccessFromIndexSignature`
- `noFallthroughCasesInSwitch`
- `noImplicitReturns`
- `verbatimModuleSyntax`
- `isolatedModules`
- `noUncheckedSideEffectImports` (TS 6+)
- `forceConsistentCasingInFileNames`
- `skipLibCheck` (keep on; do not type-check `node_modules`)

No `any`. No `!` non-null assertion. No `as` except a tracked suppression next
to the line. oxlint enforces the same with `typescript/no-explicit-any`,
`typescript/no-non-null-assertion`, and
`typescript/consistent-type-assertions` set to `never`. Configer goes first
(already `strict: true`). Backend today has `noImplicitAny` only. Panel errors
must not grow; P4 re-counts and then fixes down to zero under this contract.
Do not turn a flag off to make a phase green.

**Dev runners.** `nodemon` in the backend uses `ts-node` under the hood,
configer uses `nodemon --esm`. Both go to `bun --watch`. Do not add `tsx`.
`erasableSyntaxOnly` is not required while we still emit with `tsc` into
`dist` (backend has 3 `enum`s). Revisit it only if a later change runs `.ts`
in production without emit.

**Bun as runtime and package manager. Decided 2026-09-14.** Replaces the
2026-09-13 Node 24 + pnpm 12 target.

- P1 downloads the pinned zip and puts `bun` on `PATH`. Builds and starts
  still use pnpm and Node. A failed download starts last good `dist` on Node.
- P2 writes `bun.lock`, sets `packageManager` to `bun@1.4.2`, copies
  `bun.lock` into `dist-next`, and runs `bun install` / `bun run` from the
  update runner. The old `pnpm-lock.yaml` (format 5.4) stays in the tree so
  pnpm 7 cannot invent a format-9 file. Workspace layout stays `apps/*` and
  `packages/*` via Bun workspaces in root `package.json`.
- P3 starts pm2 apps with the absolute Bun path as the interpreter. An old
  compiled `dist` still starts. The daemon stays on Node (decided
  2026-09-25).
- Express stays. Vite stays. vitest stays. This is not Elysia and not
  `bun test`.
- `bun install` trusted-dependency / lifecycle scripts: record what must be
  allowed (`esbuild` via Vite is the usual one). Whether `bun install` prints
  on stderr must be checked on a box image, because stderr fails the update.

**Vite 2 → 8.** Six majors. Our config is small (one plugin, one alias, a Stylus
import via `__dirname`, an outDir). Vite bundles the config with `__dirname` defined,
but `import.meta.dirname` is the forward-compatible spelling. Vite 7 moved the default
browser target to Baseline Widely Available (Chrome 107+, Safari 16+); the panel PCs
run a current Chromium, so no `build.target` override is needed unless a box proves
otherwise. Vite 8 has a compatibility layer for `rollupOptions` and `esbuild` options;
we use neither. **Decided 2026-09-12: go to 8.** If 8 misbehaves, `vite@7.3.6` with
`rolldown-vite` is the documented half-step, recorded here so nobody re-derives it.
Run Vite through `bun run`.

**Lint stack. Decided 2026-09-12: oxlint + oxfmt, not ESLint 10.** Confirmed
2026-09-14 as a goal of this refactor, not a side effect. The ESLint family
(`eslint`, `@typescript-eslint/*`, `eslint-plugin-vue`, `@vue/eslint-config-*`,
`eslint-plugin-prettier`, `eslint-plugin-simple-import-sort`,
`eslint-plugin-unused-imports`, `@rushstack/eslint-patch`, `prettier`) is removed, not
upgraded. `oxfmt` covers formatting and import sorting; `oxlint` with the `import`,
`promise`, `node`, `unicorn` and `vitest` plugins covers the rules we use today, and
`oxlint-tsgolint` adds the type-aware rules. Both need a runtime newer than Node 18.
They land after P2, when `bun run` exists. oxfmt workers need Bun ≥ 1.3.11; 1.4.2
clears that. Latest on 2026-09-21: `oxlint@1.85.0`, `oxfmt@0.70.0`. Configer goes
first as its own PR (TypeScript contract, tracked suppressions, CI gate), then the
same config is copied to the other apps. `.oxlintrc.json` and `.oxfmtrc.json` live
once, at `source/`, with per-app overrides. Config-schema is a fifth target, not
listed in the first draft. CI: `oxlint --deny-warnings` and `oxfmt --check`.
Warnings are errors.

**Pino 8 → 10.** Startup's public log is a Czech one-line file with size rotation
(#90, decisions live in that PR). `pino@10` and `pino-pretty@13` change the default
shape. Upgrade only after Bun is the runtime, in the P4 library PR, and treat a
broken log format as a failed phase. `bootstrap.js` never imports pino.

**Zod.** Leave at `3.23.8`. A bump to 3.25 or 4 is not this project.

## Pull requests from here

#121 already assembled `dist-next`. The work that remains lands as these
pull requests into `feat/toolchain-jump`. Each one stays near 5000 lines.
Each one passes the legacy-image job before the next one starts. `main`
still gets one merge after the canary.

1. **Startup release path.** The rest of P1. The hold skip, `release.json`,
   the bootstrap before the pull, and the legacy-image failure cases.
2. **`bun install`.** All of P2. `source/pnpm-lock.yaml` is 6407 lines, so
   `bun.lock` may pass 5000 lines. Keep that pull request whole. Review
   `package.json` and the runner. Treat the lockfile as generated output.
3. **Apps run on Bun.** All of P3. It stays its own pull request so a red
   legacy-image job points at the process.
4. **Type contract.** TypeScript 6, the contract flags, and the backend ESM
   move. If the panel fixes pass 5000 lines, the panel is the next pull
   request. The first pull request covers configer, the backend and
   config-schema, about 1,100 lines with docs. The panel stays on
   TypeScript 4.7.4 and `vue-tsc` 0.38.9 there.

   The panel contract is its own pull request. It is stacked on the
   type-contract pull request and comes before Libraries. It keeps vue
   3.2.37, vue-router, pinia, vite and vitest.

   Proposed, owner to decide: the panel contract lands before Libraries.
   Confidence medium. The evidence is from the planner's prototype.
   - The Libraries bumps need the panel on a newer TypeScript. pinia 4.0.3
     wants TypeScript 5.6 or newer. The vue 3.5 types use `NoInfer`
     (TypeScript 5.4).
   - The panel contract does not need the vue bump. `vue-tsc` 3.3.11 only
     peers on `typescript >=5.0.0` and runs on vue 3.2.37. The `vue ^3.4`
     peer of `@vue/tsconfig` 0.9.1 is optional.
   - Size: 19 errors on `@vue/tsconfig` 0.9.1 alone, 173 errors in 32 files
     under the full contract (vue-tsc 3.3.11, TypeScript 6.0.3, vue 3.2.37).
     The panel contract PR counted 149 errors in 20 files in `src` and 13
     in the tests, and fixed all of them on vue 3.2.37.
   - What would change this: a Libraries bump that the panel's TypeScript
     4.7.4 can type-check, or a panel contract that only passes on vue 3.5.
5. **Libraries.** The P4 bumps, including Express 5 and Pino 10. The review
   checks behavior. Czech text, JSON errors, and the startup log line stay
   the same.
6. **Test and lint tools.** Vite 8, vitest 5, oxlint, and oxfmt.

TypeScript 7 is one short pull request after the type contract. The review
is a diff of the compiled output. Renovate waits until after the merge to
`main`.

## Phases

Order is fixed by the box update path: the bootstrap first, because every later
commit depends on it being in HEAD; then the Bun binary it installs; then the
lockfile and interpreter switch; then everything that needs the new runtime.
The checkboxes below are the work. "Pull requests from here" is the review
size. Each pull request must pass the legacy-image job on its own.

### P0 — Make the plan checkable

- [x] Tag the current `main` as `legacy-runtime` (`303b61e`, #100). That is the state the CI job
      upgrades from, forever. Tagged after this plan merged, so the tag includes
      #85–#91.
- [x] CI: legacy-image job (see "Upgrading from any older version"). At P0 it only
      asserts the two legacy commands still succeed against the PR head; the Bun
      version assertions are added in P1–P3.
- [x] Add `engines.node` to every `package.json` (including config-schema) and
      `engine-strict=false` on purpose, so a mismatch prints, never blocks, on a
      box. Do not add `engines.bun` until P2.
- [x] Fill `apps/startup/versions.env` with `BUN_VERSION=1.4.2`, sha256 keys for
      `bun-linux-x64` and `bun-windows-x64` only, `PM2_VERSION`,
      and the legacy `NODE_VERSION=18.12.1` / `PNPM_VERSION=7.5.0` as detect-only
      values. P0 only writes the file. `install-all.sh` starts installing Bun
      in P1, when `bootstrap.js` exists. Reuse the file from the unmerged
      pinning branch. The CI comment that already names this file becomes true.
- [x] `.npmrc`: add `frozen-lockfile=true` next to `link-workspace-packages = true`
- [x] Pin every registry dependency to one exact version in every `package.json`
      under `source/`. The specifier is `1.2.3`. It is not `^1.2.3`, `~1.2.3`,
      `*`, `latest`, or a range. Use the version this plan names. If this plan
      does not bump that package yet, use the version the lockfile already
      resolved. A `workspace:` specifier stays only where this plan already
      allows it. The backend `package.json` still has no `workspace:*`.
      CI fails if a registry specifier still has a range.
- [x] CI: add a second job on Bun 1.4.2 that runs install, build and tests but is
      allowed to fail. It shows what breaks per phase before the boxes move. The
      existing Node 18 job stays as the gate until P2.
- [x] Extend the existing `GET /status` bodies on configer and the backend with
      `node -v`, `pnpm -v` and `bun -v` (empty string until P1). Do not add a
      new route. The last-upgrade record lands in P1 once `startup.last.json`
      exists.
- [x] Lint stack decided: oxlint + oxfmt (see "Decisions taken")
- [x] Runtime decided: Bun 1.4.2, not Node 24 + pnpm 12 (see "Review 2026-09-14")
- [x] TypeScript contract decided: very strict flags (see "TypeScript contract")
- [x] Remove dead weight: `lowdb` from the backend, `axios` from the panel, the
      unused `lowdb` import in `configer/src/index.ts`, global `typescript` and
      `ts-node` from the install scripts. **Do not remove jest from startup.**
- [x] Copy the 2026-09-12, 2026-09-14, and 2026-09-21 upgrade decisions from
      the table below into `decisions.md`. That file exists now.

Size: ~0.5 day.

### P1 — HEAD bootstraps Bun from legacy

P1 is not a no-op. `BUN_VERSION` is 1.4.2, the boxes do not have Bun, so the
first boot downloads it. Install, build and start still use pnpm and Node.
A failed download starts last good `dist` on Node. P2 switches the lockfile.
P3 switches the interpreter.

- [x] `apps/startup/bootstrap.js`: dependency-free, oldest-field-Node syntax
      (assume 12 until the inventory says otherwise), reads `versions.env`,
      compares `bun -v` / `pm2 -v`, downloads the pinned GitHub zip with
      Node `https` into the OS temp dir or `~/.bun`, checks sha256, extracts
      under the user profile, prepends `PATH` for child processes, records
      `CPU_HOLD` on illegal instruction, stdout and a log file only, exit 0
      when Bun already matches and the OS is not on hold
- [x] Ubuntu: write to `$HOME/.bun/bin`. Do not call `n` or install pnpm 12.
      Harvest a Bun-shaped `ensure_bun` / `ensure_pm2` from the unmerged
      pinning branch into `startup.sh`, and probe `pino` not `winston` if
      `deps_ok` comes along. `install-all.sh` installs the same pinned Bun
      for new boxes.
- [x] Windows 10 build 17763+ and Windows 11: same zip into
      `%USERPROFILE%\.bun\bin`. No `nvm use`. Same harvest into `startup.bat`.
      Later steps use the absolute `bun.exe` path.
- [x] Windows 7, Windows 8, Windows 8.1, and Windows 10 below build 17763:
      `OS_HOLD` before any download. Do not change the git branch. Exit
      non-zero with empty stderr. Write `startup.last.json` with `ok` true.
- [x] Test on one Windows 10 box: can the autostart user write
      `%USERPROFILE%\.bun` with no UAC prompt? If not, decide between
      `sudo-prompt` (already a dependency) and a one-time on-site change,
      before P1 merges. Tested 2026-09-23. Yes. The account on that box was
      `juricj`, not the usual `babybox` name. Medium integrity. No UAC
      prompt. Do not use `sudo-prompt` for this write. No on-site change.
- [x] Root `package.json`: `"build": "node apps/startup/run-update.js"`. The
      runner calls `bootstrap.js`, then each named step in "When an upgrade
      fails". `pnpm run build` stays the one command the legacy startup runs.
      P1 still calls `pnpm install` after Bun is on `PATH`.
- [x] `source/logs/startup.last.json`: write `step`, `ok`, `message`, `at`,
      `node`, `pnpm`, `bun` on every step end. Czech one-line in `startup.log`
      as well. Success clears a previous failure. `GET /status` on configer
      and the backend include this record.
- [x] Assemble the new tree in `dist-next`. Do not rename live `dist` until
      `dist-next` is complete. Swap, then start configer and panel. If either
      start fails, swap back, start both from the restored `dist`, record
      `START_CONFIGER` or `START_PANEL`. If a step before the swap fails, start
      live `dist` unchanged. Fix the rollback install cwd (today
      `../../dist` vs `../../../dist`).
- [x] Startup app: run the bootstrap again before its own `git pull`, after a
      `git checkout -- pnpm-lock.yaml` and with a working tree check; log the
      outcome through the same step record (not a second log file).
- [x] Startup app: build when `dist/release.json` sha differs from HEAD, even
      if `git pull` prints `Already up to date`. Skip the build when `step` is
      `OS_HOLD` or `CPU_HOLD` and the OS is still in that hold. Write
      `dist/release.json` only after `START_PANEL` succeeds.
- [x] Startup app: report `node -v`, `pnpm -v`, `bun -v`, and
      `startup.last.json` on the existing `GET /status`.
- [x] Legacy-image job runs the P1 head and asserts `bun -v` = 1.4.2 after
      `pnpm run build`, empty stderr, clean tree. This is the real proof; it
      runs on every PR from here on.
- [x] Legacy-image job: force `BUILD_PANEL` to fail, assert `startup.last.json`
      names that step and carries the error, live `dist` is the previous build,
      both apps start from it. Repeat with `START_PANEL` after a good build.
      Repeat with `BOOTSTRAP_BUN` forced to fail (bad sha256): last good
      `dist` starts on Node.
- [x] Ubuntu: the user profile must be writable so the zip can land. Do not
      require a writable `/usr/local` for the jump. `installAll.sh` is gone
      (#54); do not mention it in new code. The zip lands in `$HOME/.bun/bin`.
      `startup.sh`, `bootstrap.js`, and `install-all.sh` already write that
      path. The jump does not write `/usr/local`. `install-all.sh` may still
      chown `/usr/local` for Node. That Node host stays.

Size: ~3.5 days, of which Windows is one and the failure/rollback contract is
one. Phases stay on `feat/toolchain-jump`. They do not merge to `main` one by
one. The four-OS canary in "Safe release" gates the one merge. The
legacy-image job does not replace that canary. Watch the `GET /status` fields
anyway. They are the only inventory of what Node the Windows boxes actually
run, and of which step last failed.

### P2 — pnpm install → bun install

- [x] Root `packageManager` = `bun@1.4.2`. Bun workspaces cover `apps/*` and
      `packages/*`. Delete `apps/panel/pnpm-lock.yaml`.
- [x] Generate `bun.lock`. Keep `pnpm-lock.yaml` (format 5.4) in the tree so
      pnpm 7 cannot rewrite it. The update runner never calls `pnpm install`
      after this phase.
- [x] Runner steps `INSTALL` / `DIST_PREPARE` use `bun install`. Copy
      `bun.lock` into `dist-next` with the backend `package.json`.
- [x] Record trusted lifecycle scripts (`esbuild` via Vite is the usual one).
- [x] Verify on the box image that `bun install` inside the runner prints
      nothing on stderr. If it does, either silence it or change the startup's
      stderr rule to a non-empty-exit-code rule, and record why.
- [x] `bun audit` baseline recorded in this file.
- [x] Legacy-image job asserts `bun -v` = 1.4.2 after `pnpm run build`, and
      that the tree is clean (pnpm 7 with `frozen-lockfile=true` must not have
      rewritten the lockfile before the bootstrap ran).
- [x] The Bun CI job from P0 becomes the only build job; the Node 18 job
      remains only as the host of the legacy-image job.

Trusted lifecycle scripts, checked with Bun 1.4.2. Vite 2.9.14 uses
`esbuild` 0.14.54. Its postinstall runs `node install.js`. `vue-demi` 0.14.10
also has a postinstall. Both names are on Bun's default trusted list.
`bun pm untrusted` reports 0. `package.json` does not set
`trustedDependencies`. An explicit list replaces that default list.

Stderr, checked with Bun 1.4.2. `bun install --frozen-lockfile` writes
nothing on stderr when `bun.lock` is already present. An install that sees
only `pnpm-lock.yaml` warns on stderr that lockfileVersion 5.4 cannot be
migrated. The committed `bun.lock` keeps INSTALL off that path.
`bun install` in `dist-next` prints `Saved lockfile` on stderr and rewrites
the copied lock. `bun install --no-save` installs the backend dependencies,
leaves the copied lock in place, and writes nothing on stderr. The runner
still fails a step on any stderr. The rule did not change.

`bun audit` baseline, Bun 1.4.2, 2026-09-23. 79 vulnerabilities: 2 critical,
27 high, 38 moderate, 12 low. The critical items are `handlebars` 4.7.7
through newman, and `vitest` 0.9.4. Later library bumps change this count.
This phase does not gate CI on it.

Size: ~0.5 day. Must be the same PR as, or a later PR than, P1: a `bun.lock`
world on `main` without the bootstrap in the `build` script leaves pnpm 7 to
run `pnpm install` and dirty the tree.

### P3 — Apps run on Bun

- [x] pm2 starts configer and the panel backend with the absolute Bun path.
      Do not use `bun` from `PATH`. The apps stop running on Node.
      `start:configer` and `start:main` run `node apps/startup/start-app.js`.
      The helper runs on the legacy Node. The apps run on Bun.
- `@types/node` and `@types/bun`: moved to the type-contract PR, which kept
  `@types/node` 18.x (see P4).
  TypeScript 4.7.4 cannot parse `bun-types` 1.4.2 (TS1005, TS1139).
  `skipLibCheck` does not cover a syntax error. `@types/node` 24.13.4 needs
  TypeScript 5.6.
- [x] pm2 → 7.0.4 pinned. If the pm2 daemon cannot run on Bun, leave it on
      the existing Node and only switch the app interpreter. Record which.
      The daemon stays on Node. Only the app interpreter changed.
      `install/windows.js` reads `PM2_VERSION`.
- [x] Prove last good `dist` (compiled JS from before this phase) still
      starts when the interpreter is Bun. legacy-boot1 builds the tag with
      the legacy toolchain. A failed boot 1 build then starts that dist on
      Bun.
- [x] After boot 2, `startup.sh` / `startup.bat` may call the runner with
      `bun` or still `node`. Either is fine. Legacy autostart still uses
      `pnpm run build`. Both still call Node.
- [x] Legacy-image job asserts the spawned apps are Bun processes.
      `assert-runtime.js` checks `pm2 jlist` and the process executable.
      The BOOTSTRAP_BUN case expects Node.

Size: ~1 day (the boot 1 job).

### P4 — TypeScript 4.7 → 6.0.3, the contract, and the libraries

Still the JS compiler, so `vue-tsc` keeps working. Fix everything TS 6
deprecates, so P6 is a swap of the binary, not a migration. Turn on the
TypeScript contract. Do not add `tsx`.

- [x] `typescript@6.0.3` in root, backend, configer and config-schema.
      Configer and config-schema pin their own 6.0.3, then 7 in P6.
- [x] `typescript@6.0.3` in the panel, with `vue-tsc` 3.3.11. The panel
      contract PR, after the type-contract PR.
- [ ] `@types/bun` and the `@types/node` version, moved here from P3.
      TypeScript 4.7.4 cannot read either. A box on the Node fallback still
      starts the new `dist` on Node. The type-contract PR kept `@types/node`
      18.x in the backend and configer and added no `@types/bun`. The
      compiler then rejects a Node 20+ API such as `import.meta.dirname`.
      Owner to confirm, see "Open questions". The panel contract PR moved
      the panel `@types/node` to 18.11.18. Only its tests and
      `vite.config.ts` load it.
- [x] The TypeScript contract flags in configer, the backend and
      config-schema. Configer first. Two tracked suppressions. No flag off.
- [x] The TypeScript contract flags in the panel. No tracked suppression.
      No flag off. `tsconfig.app.json` copies the flag block, as the other
      units do.
- [x] Backend to ESM: `"type": "module"`, tsconfig `module`/`moduleResolution:
      node16`, `.js` on relative imports,
      `path.dirname(fileURLToPath(import.meta.url))` (not
      `import.meta.dirname`, which needs Node 20.11), drop every
      `import x = require()`; the 10 jest test files move to vitest 0.9.4 in
      the same PR because ts-jest is the last CommonJS tool; replace
      `baseUrl` with a relative `paths` entry for `@babybox/config-schema` so
      TS 7 can drop `baseUrl`
- [x] Panel: `@vue/tsconfig@0.9.1`, `vue-tsc@3.3.11`, remove `baseUrl`, make
      `paths` relative, fix the known typecheck errors (re-count first; 20 at
      1927135) down to zero under the contract, make `bun run build` actually
      run the type gate over `src` (learnings.md says it checks zero files
      today).
      The gate is `vue-tsc --noEmit -p tsconfig.app.json`. It checks 99
      files: `env.d.ts`, 56 `.ts` and 42 `.vue`. It checked none before.
      Contract: 149 errors in 20 files, now 0. Tests: 13, now 0. The CI
      step "Panel typecheck" checks the tests and `vite.config.ts`. The 20
      at 1927135 counted the tests together with the app. 13 of them came
      from chai's `should`, 2 exist only on TypeScript 4.7, and 5 were
      strict errors in the app.
      Measured on Node 18.12.1 in Docker (arm64 on Apple silicon, 10 cores):
      the panel `build` takes 4.3 to 4.5 s and 340 MB peak RSS. Before it
      took 2.3 to 2.6 s and 278 MB. The type check alone takes 2.3 s. A box
      CPU is slower. Not yet measured on a box.
- [x] Configer: confirm with `tsc --noEmit` under the contract. Config-schema:
      confirm the same; it is already on `node16` / `strict`
- [x] `ts-node` / `nodemon` → `bun --watch` for backend and configer
- [ ] vue 3.5.43, vue-router 5.3.1, pinia 4.0.3 + `@vue/devtools-api`, lodash 4.18.1,
      howler 2.2.4, moment 2.31.0, stylus 0.64.0
- [ ] axios 1.20.0 in the backend only
- [ ] express 5.2.1 + `@types/express@5` in backend and configer; add a JSON error
      middleware to both; extend the empty-body and missing-Content-Type tests for
      `undefined` as well as `{}`
- [ ] cors, dotenv 18.0.2 (silence any load banner), morgan, winston, fs-extra 11,
      newman 6, pino 10.3.1, pino-pretty 13.1.3 (prove #90's file format and
      rotation still hold). nodemon is already gone (type-contract PR).
- [ ] `open@11.0.4` as a plain ESM import once the backend is ESM
- [ ] lowdb 7 in configer (`versions.json` only)
- [ ] Full manual run: panel against a real engine and thermal unit, camera feed,
      sound alerts, settings page, restart route, config page save (PUT and PATCH
      from #85/#88/#91)

Size: ~3 days. The contract, the backend ESM conversion, express 5 and the
panel typecheck are most of it. Pino is extra compared to the first draft.

### P5 — Test and lint toolchain

- [ ] vite 8.3.0, @vitejs/plugin-vue 6.0.9, vitest 5.0.1, jsdom 30.1.0 in the panel;
      `vite.config.ts` to `import.meta.dirname`; run through `bun run`
- [ ] Prove `bun install` accepts jsdom 30.1.0 (`engines.node` is `^22.22.2 ||
      ^24.15.0 || >=26`). If it refuses, pin the newest jsdom that Bun accepts
      and record the pin here. Do not turn on `engine-strict`.
- [ ] vitest 5 in the backend (moved in P4), configer, config-schema and startup;
      `jest`, `ts-jest`, `@types/jest` removed everywhere; note the 2026-09-11
      decision that accepted two runners as superseded. Put startup tests in CI.
      Do not switch to `bun test`.
- [ ] oxlint 1.85.0 + oxfmt 0.70.0 (or latest at the time): configer first (its own
      PR, with the TypeScript contract already on, type-aware oxlint rules,
      tracked suppressions), then panel (`vue` plugin), backend, startup,
      config-schema
- [ ] Remove the ESLint and Prettier family from every `package.json`; delete the three
      `.eslintrc*` files and `.prettierrc.json`
- [ ] CI: `oxlint --deny-warnings` and `oxfmt --check` replace the three eslint lines

Size: ~1.5 days.

### P6 — TypeScript 7.0.2

- [ ] Backend, configer and config-schema: `typescript@7.0.2` as their own
      devDependency; `tsc` and `tsc --build` produce identical `dist` output
      (diff it)
- [ ] Root: `typescript@7.0.2`, or nothing if no root code compiles
- [ ] Panel: stays on `typescript@6.0.3`; `vue-tsc` 3.3.11 crashes on 7 (tested
      2026-09-12, still the latest Volar on 2026-09-13). Re-test at each Volar
      major and move when it passes. `vue-tsc` also needs a Node runtime. On
      Bun it loads no `.vue` file (TS2307).
- [ ] Remove any `ignoreDeprecations` left from P4
- [ ] TS 7 pulls a platform binary (`@typescript/typescript-linux-x64`,
      `-win32-x64`); the legacy-image job on Linux and the Windows runner both
      confirm one resolves from the lockfile with `bun install --frozen-lockfile`

Size: ~0.5 day.

### P7 — Keep it that way

- [ ] Add Renovate or Dependabot with grouped, weekly PRs. Each bump is an
      exact version. CI on Bun 1.4.2 and the legacy-image job are the gate.
- [ ] `bun outdated` and `bun audit` in the CI summary
- [ ] Delete `pnpm-lock.yaml` only when `GET /status` from every known box
      shows Bun, or a box is written off
- [ ] Decide when the legacy bootstrap may go: only when `GET /status` from every
      known box shows Bun, or a box is written off. Until then the
      `legacy-runtime` tag and the job stay. Record the date in decisions.md.
- [ ] Update `CLAUDE.md`, `README.md`, and the "Known constraints" section of
      [config-ui.md](config-ui.md) (it still says TypeScript 4.7, Vite 2, Node 18,
      and 20 panel typecheck errors)

Size: ~0.5 day.

---

## Total

Roughly **11 to 12 focused days**. Phases stay on `feat/toolchain-jump`. The
legacy-image job proves the tip is reachable from a legacy box, and that a
forced failed step still starts the previous `dist`. The one merge waits on
the four-OS canary. The bootstrap stays in HEAD for years. A Windows 8 box
keeps the current panel until that computer gets an OS that can run Bun.

A cut-down version that unblocks the toolchain is P0 through P3 plus oxlint /
oxfmt, about 6 days. It stops short of TypeScript 7, Vite 8 and the full
contract, which is where most of the migration risk sits.

## Known constraints

- A failed upgrade names the step and keeps the error in `startup.last.json`
  and in `startup.log`. The last good `dist` starts. HEAD is not reset. Bun,
  Node and pnpm are not reverted.
- The box update path treats any stderr from `pnpm run build` as a failure. Every
  phase is verified by the legacy-image job (Node 18.12.1 + pnpm 7.5.0 + the
  `legacy-runtime` checkout) before it lands on `main`.
- `apps/startup` and `bootstrap.js` stay on the oldest field Node's syntax (assume 12)
  with no new dependencies until the last legacy box is gone. They are the code that
  runs on the old runtime. Pino is already in startup; `bootstrap.js` still uses
  none of it.
- The release covers Ubuntu 22.04+, Windows 10 build 17763+, Windows 11, and
  Windows 8. Windows 8 takes `OS_HOLD`. It does not take Bun. The canary in
  "Safe release" is the merge gate.
- Do not merge a phase to `main` by itself. Do not `git checkout` another
  branch from the box.
- `pnpm@7.5.0` cannot reach the registry on Node 20+ (learnings.md). Until P2 lands,
  lockfile changes are made from a Node 18 shell. After P2, use `bun install`.
- `configs/main.json` persists across updates. No phase changes its on-disk shape.
- All UI text is Czech; version bumps must not alter rendered text (moment locale,
  number formatting, startup log lines).
- `moment` stays. It works, and 17 call sites are a separate, smaller project.
- The backend `dist` is installed standalone. No `workspace:*` in the backend
  `package.json`. Config-schema stays a type-only import.
- Zod stays at 3.23.8. Zod 4 is out of scope.
- `@types/node` stays 18.x in the backend and configer while the Node
  fallback can start their new `dist`. No `@types/bun` there. Pending owner
  confirmation. Do not follow npm's 26.
- Express stays Express. Vite stays Vite. Tests stay vitest.
- BUILD_PANEL runs `vue-tsc` on the first `node` on `PATH`. Without one it
  fails with TS2307. It needs Node 16 or newer: `vue-tsc` 3.3.11 fails on
  Node 14.21.3 with a SyntaxError (`??=`). 16.20.2 and 18.12.1 pass.
- The panel build type-checks `src` on every box update. A slow or
  out-of-memory check fails BUILD_PANEL. The last good `dist` starts, but
  the box does not update.
- Do not turn a TypeScript contract flag off to make a phase green.
- Every registry dependency is pinned to one exact version in `package.json`.
  The lockfile records that same version. A bump writes the new exact version.
  No caret, tilde, star, `latest`, or range.

## Decisions taken (2026-09-12, owner)

Copied into `decisions.md` in P0. `decisions.md` exists as of #85.

| Question | Answer | Consequence |
|---|---|---|
| Windows boxes in the field? | Yes, half the fleet, Windows 7/8/10/11, nvm-windows, installed by hand | Amended 2026-09-21: Windows 8 holds on the current panel. It does not switch branch. Windows 10 build 17763+ and Windows 11 take Bun. |
| Ubuntu provisioning? | `installAll.sh` (old) and `install-all.sh` (new); both use `n` with `/usr/local` owned by the user | Amended 2026-09-13: `installAll.sh` is gone (#54); only `install-all.sh` remains. Amended 2026-09-14: new boxes install Bun from `versions.env`, not Node 24. |
| Offline tail? | Months, sometimes years | Bootstrap stays in HEAD indefinitely. The `legacy-runtime` tag is permanent. There is no `legacy` branch. |
| Backend and ESM-only packages? | Convert the backend to ESM | P4 grows by ~0.5 day; `open@11` becomes a plain import |
| Backend tests? | vitest | jest, ts-jest, @types/jest removed; one runner. Startup tests join in P5. Not `bun test`. |
| Lint stack? | oxlint + oxfmt | ESLint and Prettier family removed, not upgraded; configer first; warnings are errors |
| Volar on TypeScript 7? | Not required, use the latest tooling | Tested: `vue-tsc` 3.3.11 crashes on TS 7.0.2, works on 6.0.3. Still the latest Volar on 2026-09-13. The latest working tooling for the panel is TS 6.0.3; backend, configer and config-schema build with TS 7 |
| Vite 8 or hold at 7? | Upgrade | Vite 8.3.0; 7.3.6 + `rolldown-vite` only as a documented fallback |
| Failed upgrade? | Name the step and the error, start last good `dist` | `startup.last.json` + `GET /status`; no `git reset`; no toolchain revert |

## Decisions taken (2026-09-14, owner)

| Question | Answer | Consequence |
|---|---|---|
| Runtime after the jump? | Bun 1.4.2, pinned | Replaces Node 24 + pnpm 12. One zip, user-profile install, `bun.lock`. Node 18 and pnpm 7 stay as the bootstrap host and `pnpm run build` hook. |
| TypeScript strictness? | The TypeScript contract | Extra flags on every compile unit. No `any`, no `!`, no `as` except a tracked suppression. Configer first. |
| HTTP / bundle / tests? | Express 5, Vite 8, vitest 5 | Not Elysia, not `Bun.serve`, not `bun build`, not `bun test`. |
| Dev runner? | `bun --watch` | ts-node, tsx and nodemon removed. |

## Decisions taken (2026-09-21)

| Question | Answer | Consequence |
|---|---|---|
| Where does the work land? | `feat/toolchain-jump`, long-lived | Topic pull requests merge into that branch. `main` gets one merge after the canary. Do not delete the branch. |
| How is a topic tracked? | One pull request into `feat/toolchain-jump` | Open that pull request for every topic. Do not merge it unless the owner asks. #102 stays the open pull request into `main`. |
| What does a restart do? | It is the release | A pull or a checkout done before the restart still builds, unless the OS is on hold. |
| Windows 8? | `OS_HOLD` | The current panel stays up. The git branch does not change. The tree stays clean. A later OS install plus a restart takes the jump. |
| Windows 10 and 11? | Jump when the build is 17763 or newer | Older Windows 10 uses the same hold as Windows 8. |
| Ubuntu? | Jump | `install-all.sh` already requires 22.04+ and installs `unzip`. |
| Baseline Bun zip? | Do not use it | It is an alias of the same x64 binary. An illegal instruction is `CPU_HOLD`. |
| How are dependencies declared? | Exact versions only | Every registry specifier in `package.json` is `1.2.3`. No `^`, `~`, `*`, `latest`, or range. The lockfile matches. P0 pins current packages. Later phases write the new exact version. Renovate bumps stay exact. |

## Decisions taken (2026-09-23)

| Question | Answer | Consequence |
|---|---|---|
| How big is a remaining pull request? | About 5000 lines | The six pull requests in "Pull requests from here". A 500 line cap would split one behavior across several reviews. |
| What if `bun.lock` is longer? | Keep P2 as one pull request | Review `package.json` and the runner. The lockfile is generated. |
| Does P3 join P2? | No | A red legacy-image job then points at install or at the process. |
| What if the type contract passes 5000 lines? | The panel is the follow-up | Configer, the backend, config-schema, and the ESM move stay in the first contract pull request. |
| When do TypeScript 7 and Renovate land? | After the six | TypeScript 7 is a short pull request. Renovate waits until after the merge to `main`. |
| Can the autostart user write `%USERPROFILE%\.bun`? | Yes, with no UAC prompt | Tested 2026-09-23 on one Windows box as `juricj` at Medium integrity. The usual fleet account name is `babybox`. This box uses `juricj`. The folder is that user's profile. Do not use `sudo-prompt`. No on-site permission change. |

## Decisions taken (2026-09-24)

| Question | Answer | Consequence |
|---|---|---|
| Where does the Ubuntu Bun zip land? | `$HOME/.bun/bin` | The jump does not need a writable `/usr/local`. `startup.sh`, `bootstrap.js`, and `install-all.sh` already write that path. `install-all.sh` may still chown `/usr/local` for Node. That host stays. |

## Decisions taken (2026-09-25)

| Question | Answer | Consequence |
|---|---|---|
| How does pm2 get the Bun path? | A Node helper, `apps/startup/start-app.js` | The root start scripts call only `node`. The helper passes the absolute Bun path to pm2. Not `bun` from `PATH`, not `$HOME` in a script, not an ecosystem file. |
| Where does the pm2 daemon run? | On Node | Every pm2 call starts the daemon on the Node its shim finds. Bun brings nothing to that process. |
| Does the startup app move to Bun after boot 2? | No | It must run on the oldest Node for boot 1 and for hold boxes. `startup.sh` and `startup.bat` still call Node. |
| What if `bun -v` is not `BUN_VERSION`? | Run the apps on that Bun | That binary ran the last good `dist`. A hold OS, a CPU hold, a missing binary, or a `bun -v` that fails starts on Node. |
| When do `@types/node` and `@types/bun` move? | In the type-contract PR | TypeScript 4.7.4 cannot read `@types/bun` 1.4.2 or `@types/node` 24.13.4. |
| Which `@types/node` in the backend and configer? | 18.x, no `@types/bun`. Pending owner confirmation. | The new `dist` can start on the Node 18 fallback. The compiler must reject a Node 20+ API. |
| How does the ESM backend find its folder? | `path.dirname(fileURLToPath(import.meta.url))` | `import.meta.dirname` needs Node 20.11. |
| Which vitest runs the backend tests? | 0.9.4, the version configer and the panel use | vitest 5 needs vite 6.4 or newer and fails on Node 18. P5 moves every unit to 5. |
| How is a cast tracked? | `// oxlint-disable-next-line typescript/consistent-type-assertions -- <reason>` on the line above | Two in this PR: configer boot merge, backend boot config. `as const` is not a cast. |
| Are test files type-checked? | Not yet | They stay out of every tsconfig, as in configer. Test tsconfigs come in P5. The panel is the exception, see below. |
| What does the panel build check? | `src`, with `vue-tsc --noEmit -p tsconfig.app.json` | 99 files. The CI step "Panel typecheck" checks the tests and `vite.config.ts`. The box does not. |
| Are the panel tests type-checked? | Yes, in CI | The panel already had `tsconfig.vitest.json`. `@vue/reactivity` 3.2.37 is a devDependency for the chai bail type. It moves with vue. |
| `composite` in the panel? | No | With it, `vue-tsc -p` writes `tsconfig.app.tsbuildinfo` on every build. |
| Vue 3.2 DOM types under `exactOptionalPropertyTypes`? | Leave the attribute off, never pass `undefined` | Eight workarounds in four SFCs until vue 3.5. Never `pattern=""`. |

## Open questions

- [x] Windows 8: answered 2026-09-21. Hold in place. Do not park on another branch.
- [x] Can the autostart user write `%USERPROFILE%\.bun` with no UAC prompt on the
      Windows 10/11 boxes? Yes. Tested 2026-09-23 on one box as `juricj` at
      Medium integrity. The usual account name `babybox` was not the account
      on that box. `mkdir` of `%USERPROFILE%\.bun\bin` and a probe file
      succeeded. Windows showed no consent dialog. Do not use `sudo-prompt`
      for this write. No on-site permission change. The old `nvm use` UAC
      question stays gone unless pm2 cannot run on Bun and we have to switch
      Node.
- [ ] What Node do the Windows boxes actually run? nvm-windows "mimicked" 18.12.1, but
      Node 18 does not install on Windows 7/8. Sets the syntax floor for
      `bootstrap.js`; assumed Node 12 until known. It also decides whether
      pm2 7.0.4 (engines Node ≥ 18) runs there. It ran on Node 16.20.2 in
      one local check. Node 14 was not tested. Since the panel contract PR,
      BUILD_PANEL also needs Node 16 or newer: `vue-tsc` 3.3.11 fails on
      Node 14.21.3. The old `vue-tsc` 0.38.9 ran there.
- [x] Can the pm2 daemon run on Bun, or only the apps? Answered 2026-09-25.
      The daemon stays on Node. Every pm2 call starts it on the Node its
      shim finds, including the old startup's `pm2 delete`. The app
      interpreter is the absolute Bun path.
- [ ] `START_CONFIGER` and `START_PANEL` pass when pm2 accepts the process.
      Should `START_PANEL` wait for `GET /status` before it writes
      `release.json`? A Bun crash after `pm2 start` returns 0 is not rolled
      back.
- [ ] `dist-release.js` spawns `pnpm.cmd` with `shell: false`. Node 18.20.2+
      and 20.12.2+ refuse that (EINVAL). The Windows fleet Node is unknown.
- [ ] `GET /status` `node` shows the Node version Bun reports (`v26.3.0`).
      Add a runtime field?
- [ ] `bun install --no-save` in `dist` installs the backend
      devDependencies too. This plan says `--omit dev`. Since the type
      contract they include vitest 0.9.4, so also vite 2.9.14 and the
      esbuild postinstall.
- [ ] Owner: make `legacy-boot1` a required check. On two #128 runs it took
      about 1.5 minutes on Ubuntu and 3.5 to 5 minutes on Windows, in
      parallel with the other jobs. A whole run took 4.5 to 5 minutes. The
      longest job before this pull request took about 4.5 minutes.
- [ ] The install scripts still install `nodemon` at `latest`.
- [ ] `bootstrap.js` logs `pm2 je [PM2] Spawning PM2 daemon …` when its
      `pm2 -v` starts the daemon. It reads the first stdout line. The log
      line is wrong. The build does not fail.
- [ ] Owner: `@types/node` stays 18.x in the backend and configer, with no
      `@types/bun`. Their new `dist` can start on the Node 18 fallback
      (hold OS, CPU hold, missing Bun), so the compiler must reject a Node
      20+ API. With 24.13.4, `import.meta.dirname` compiles and throws on
      Node 18. This deviates from the P3 plan text (24.x plus `@types/bun`).
      Move to 24.x when no box can start the apps on Node 18.
- [ ] Owner: land the panel contract before Libraries. See "Pull requests
      from here", item 4.
- [ ] No tsconfig type-checks the test files. Under the contract they have
      18 errors in the backend, 16 in configer and 56 in config-schema, and
      about 50 `as`. Add a test tsconfig per unit in P5. The panel tests
      are checked since the panel contract PR.
- [ ] `tsc` does not clean `outDir`. A box keeps the old
      `apps/backend/dist/__tests__/*.js` and `types/data.types.js`, and the
      startup copies them into `dist`. Nothing imports them.
- [ ] `?timeout` on the settings route is a string at run time, but
      `GetUnitSettingsRequest` types it as a number. The data routes read it
      through `queryTimeout()`; the settings route does not.
- [ ] The root `dev` scripts still call `pnpm -F`.
- [ ] `bun install --no-save` in a `dist` that has `.env` prints the `.env`
      load and the resolve lines on stderr (Bun 1.4.2). Exit 0, the lock
      does not change, and the startup does not fail on it. The same
      happens before the type contract. The comment in `dist-release.js`
      says the install writes nothing on stderr.
- [ ] Small backend and configer leftovers: `restartRepository()` returns
      `lastRequest` and `errorStreak` as values that never update; the
      configer `DbFactory` error names a `getInstance` that does not exist;
      the engine route calls `transformThermalData`; the backend
      `package.json` `main` points at `./src/index.ts`.
- [ ] npm reports vitest 5.0.2 on 2026-09-25; the plan pins 5.0.1.
      Re-check at P5. `bun audit` still reports 79 (2 critical, 27 high,
      38 moderate, 12 low).
- [ ] Owner: one shared `source/tsconfig.contract.json` that every unit
      extends, instead of a copy of the contract flags in each tsconfig.
      From the review of #129. The panel tsconfigs copy the block too and
      would move to the shared file.
- [ ] `dist-release.js` keeps its own copy of the Bun path and the CPU hold
      check (`installedBunVersion`, `readCpuHold`). `start-app.js` uses the
      `bootstrap.js` exports. Fold the startup copy in in a later change.
- [ ] `isInstanceOfGetUnitSettingsRequest` accepts `?unit=` (an empty
      string). `GET /units/settings?unit=` then answers 200 with no data,
      not 400. The logic is the same as before #129. A fix changes
      behaviour.
- [ ] `vue-tsc` needs a Node runtime. If P7 removes Node from the boxes,
      BUILD_PANEL has no `node` to run it on.
- [ ] Measure the panel build on a real box. The P4 numbers come from
      Docker on Apple silicon.
- [ ] `<router-link>` and `<router-view>` props are not type-checked.
      vue-router 4.1.3 extends `GlobalComponents`, which vue 3.2.37 does not
      have. Check again after vue 3.5.
- [ ] After vue 3.5, drop the Vue 3.2 attribute workarounds: the optional
      attributes in `BaseInput`, `srcAttr` and `topBorder` in the camera
      views, `?? ''` and `=== true` on `value` and `disabled`.
- [ ] The panel tests keep six `as` and one `let resolve!:`. P5 lint
      removes them.
- [ ] The panel has four `isObject` helpers: `utils/general.ts`,
      `api/config.ts`, `api/reload.ts` and `utils/panel/instanceCheck.ts`.
      Keep one.
- [ ] The panel no longer reads the root `@types` folder. TypeScript 6
      loads only what `types` names. The root `@types/*` can move to the
      apps that use them.
- [ ] Small panel leftovers: `VivotekCameraView` types `imageRef` as
      `HTMLImageElement`, binds it to an `<iframe>`, and never reads it.
      `SettingsFormTableRow` passes `:value` to `BaseInput` as a
      fall-through attribute, not as `modelValue`. `maxH + 'px'` renders
      `undefinedpx` when no size is passed. `settingsRowValueToValue` reads
      `multiplier` and never uses it. `ConnectionResult` is defined twice.
      `logic/settings/table.ts` is an empty file.

## Progress log

One line per landed step: date, PR, what moved.

- 2026-09-12 — plan written; nothing landed.
- 2026-09-12 — owner answered the open questions; Windows path, backend ESM, vitest,
  oxlint + oxfmt, Vite 8 recorded. `vue-tsc` on TS 7 tested and ruled out.
- 2026-09-13 — plan reviewed against `origin/main` (`cee4df0`, #91). Jump design
  kept. Inventory updated for config-schema, pino, CI, dead axios, startup tests,
  and the unmerged pinning branch. No upgrade code landed.
- 2026-09-13 — owner: a failed step must be named with its error, and the last
  good `dist` must start. Recorded as "When an upgrade fails". P1 grows by
  about a day.
- 2026-09-14 — owner: also move to Bun, very strict TypeScript, oxlint and
  oxfmt. Target runtime is Bun 1.4.2. Node 24 + pnpm 12 dropped. TypeScript
  contract recorded. P2 is `bun install`. P3 is the interpreter switch. No
  upgrade code landed.
- 2026-09-21 — release review against `origin/main` `6eb4fbf`. The boot that
  already has the commits must still build. Windows 8 holds in place and does
  not switch branch. The baseline zip retry is removed. Pins refreshed from
  `npm view`. No upgrade code landed. The execution branch is
  `feat/toolchain-jump`.
- 2026-09-21 — owner: every registry dependency is an exact version. Recorded
  as a known constraint, a decision, and a P0 box. No upgrade code landed.
- 2026-09-21 — tagged `origin/main` `303b61e` (#100) as `legacy-runtime`.
  Rebased `feat/toolchain-jump` onto that commit. The tag is on origin. No
  upgrade code landed.
- 2026-09-21 — #104 — owner: each topic is a pull request into
  `feat/toolchain-jump`. The long-lived branch stays open. #102 stays the
  pull request into `main`.
- 2026-09-21 — #105 — legacy-image job starts from the `legacy-runtime` tag
  and checks that `git pull` and `pnpm run build` still succeed with empty
  stderr and a clean tree. Panel `*.tsbuildinfo` files are ignored so that
  build does not dirty the checkout. Bun checks stay for P1.
- 2026-09-21 — #106 — every `package.json` declares `engines.node` `18.12.1`.
  `engine-strict` is false, so a mismatch prints and does not stop install.
  `engines.bun` stays out until P2.
- 2026-09-21 — #107 — `apps/startup/versions.env` stores Bun 1.4.2, the two x64 zip
  sha256 values, pm2 7.0.4, and detect-only Node 18.12.1 / pnpm 7.5.0.
  No script reads the file yet. `install-all.sh` stays unchanged.
- 2026-09-21 — #108 — `source/.npmrc` sets `frozen-lockfile` to true. A lockfile pnpm
  cannot read fails the install. pnpm does not rewrite the file.
- 2026-09-21 — #109 — every `package.json` under `source/` pins each registry dependency
  to the version `pnpm-lock.yaml` already resolved. CI fails when a registry
  specifier is still a range. `workspace:*` stays on the panel and configer.
  The backend still has none.
- 2026-09-21 — #110 — a second CI job runs install, build, and tests on Bun 1.4.2.
  The job is allowed to fail. The Node 18 job stays the gate until P2.
- 2026-09-21 — #111 — GET /status on configer and the backend reports node, pnpm, and bun.
  bun is an empty string when that binary is not on PATH. The last-upgrade record stays in P1.
- 2026-09-21 — #112 — the backend drops unused lowdb, the panel drops unused axios, and
  configer drops the unused lowdb import. The install scripts no longer install
  global typescript or ts-node. Startup keeps jest. The lockfile stays format 5.4.
- 2026-09-21 — #113 — the 2026-09-12, 2026-09-14, and 2026-09-21 upgrade decisions are
  copied into `decisions.md`. P0 has no open box.
- 2026-09-22 — #114 — bootstrap.js reads versions.env and installs the pinned Bun zip
  under the user profile when that binary is missing or different. It exits 0
  when Bun already matches and the OS is not on hold. An illegal instruction
  is CPU_HOLD. The same pin does not download another zip.
- 2026-09-22 — #115 — Ubuntu startup.sh writes the pinned Bun zip to `$HOME/.bun/bin`
  and installs the pinned pm2. It does not call `n` and it does not install pnpm.
  `install-all.sh` uses the same pin for a new box. The script does not run `git pull`.
- 2026-09-22 — #116 — Windows startup.bat writes the pinned Bun zip to
  `%USERPROFILE%\.bun\bin` on Windows 10 build 17763 or newer, and on Windows 11.
  It does not use nvm. Later steps call the absolute bun.exe path.
  An older Windows release does not download the zip.
- 2026-09-22 — #117 — Windows 7, Windows 8, Windows 8.1, and Windows 10 below
  build 17763 record `OS_HOLD` before any download. The boot exits non-zero
  with empty stderr. `startup.last.json` has `ok` true. The git branch does
  not change. The panel still starts.
- 2026-09-22 — #118 — root `build` runs `node apps/startup/run-update.js`.
  The runner calls `bootstrap.js`, then `pnpm install`, then each package build.
  A hold exits before install. A failed step stops the chain.
- 2026-09-22 — #119 — each update step writes `startup.last.json` with step,
  ok, message, at, node, pnpm, and bun. A success replaces a stale failure.
  GET /status on configer and the backend includes the record.
- 2026-09-23 — #121 — the startup app assembles the new build in `dist-next`
  and swaps it into `dist` only after that tree is complete. A failed start
  restores the previous `dist` and starts both apps. The rollback install
  runs in the repo `dist`.
- 2026-09-23 — #122 — the remaining work is six pull requests of about 5000
  lines. See "Pull requests from here".
- 2026-09-23 — #123 — the startup app builds when `dist/release.json` differs
  from HEAD, including when git pull prints Already up to date. It skips that
  build on `OS_HOLD` and on `CPU_HOLD` when `~/.bun/cpu-hold` matches the pin.
  It writes `release.json` only after `START_PANEL`. It runs bootstrap before
  its own git pull. The legacy-image job checks bun 1.4.2, the already-current
  build, and a forced failure at `BUILD_PANEL`, `START_PANEL`, and
  `BOOTSTRAP_BUN`.
- 2026-09-23 — #124 — the update runner installs with bun 1.4.2. `packageManager`
  is `bun@1.4.2`. Workspaces cover `apps/*` and `packages/*`. `bun.lock` is in
  the tree and is copied into `dist-next`. `pnpm-lock.yaml` stays format 5.4.
  The panel pnpm lockfile is gone. `bun install` in the runner writes nothing
  on stderr, so the stderr rule stays. `bun audit` reports 79 vulnerabilities
  (2 critical, 27 high, 38 moderate, 12 low). The Bun job is the only build
  job. Node 18 only hosts the legacy-image job.
- 2026-09-23 — #125 — the logged-in Windows user can write
  `%USERPROFILE%\.bun` with no UAC prompt. Tested as `juricj` at Medium
  integrity. The usual account name `babybox` was not the account on that
  box. The jump does not use `sudo-prompt` for this write. No on-site
  permission change.
- 2026-09-24 — #127 — the Ubuntu Bun zip lands in `$HOME/.bun/bin`. The jump
  does not need a writable `/usr/local`. `startup.sh`, `bootstrap.js`, and
  `install-all.sh` already write that path. `install-all.sh` may still
  chown `/usr/local` for Node. That host stays.
- 2026-09-25 — #128 — configer and the backend run on Bun 1.4.2. pm2 gets
  the absolute Bun path from `apps/startup/start-app.js`. A hold OS, a CPU
  hold, or a Bun that does not answer starts the same files on Node. The
  pm2 daemon and the startup app stay on Node. The Windows install script
  pins pm2. `legacy-boot1` runs the old startup app with pm2 5.2.0 and
  6.0.14: the legacy `dist` starts on Bun after a failed build, the new
  `dist` after a good one. `@types/node` 24 and `@types/bun` move to the
  type-contract PR.
- 2026-09-25 — #129 — configer, the backend and config-schema build with
  TypeScript 6.0.3 under the contract flags. The backend is ESM. Its ten
  test files run on vitest 0.9.4. The backend and configer dev servers run
  under `bun --watch`. The panel stays on TypeScript 4.7.4 and `vue-tsc`
  0.38.9. `@types/node` stays 18.x in the backend and configer until the
  owner confirms.
- 2026-09-25 — #130 — the panel builds with TypeScript 6.0.3 and
  `vue-tsc` 3.3.11 under the contract flags. The build type-checks 99 files
  in `src`; it checked none before. The tests and `vite.config.ts` are
  checked in CI. vue, vue-router, pinia, vite and vitest are unchanged.
