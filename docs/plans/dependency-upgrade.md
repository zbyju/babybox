# Dependency upgrade

Status: **not started** (no upgrade code on `main`)
Owner: —
Last updated: 2026-09-13 (inventory and "latest" versions re-checked this date;
the jump design is unchanged from 2026-09-12)

## Goal

Move every package in `source/` to its latest published version, TypeScript
included (7.0.2, the native compiler, not just a 5.x), without breaking the
unattended update path on a single deployed babybox.

This file is the one place where the upgrade is tracked. Tick the boxes here,
record decisions in [decisions.md](../decisions.md), lessons in
[learnings.md](../learnings.md).

This plan is for the deployed `zbyju/babybox` panel computers. The
`babybox-mono` rewrite does not replace it. A box that is off for a year still
has to boot from this repo.

## Review 2026-09-13

Checked against `origin/main` at `cee4df0` (#91) and against npm on this date.
The jump design is still the whole plan. What changed is the inventory, a few
checkboxes, and one unmerged branch that must not be mistaken for P1.

### Still the core

- Node 18 is end of life. pnpm 7.5.0 still cannot reach the registry from
  Node 20+. Vite 7+, Vitest 4+, ESLint 10, jsdom 21+, oxlint and oxfmt still
  refuse Node 18.
- A box never sees phases. HEAD must bootstrap the runtime from the legacy
  Node and pnpm, in one boot, two at most. A fleet gate cannot be relied on.
- The first-jump hook is still HEAD's root `build` script. Today's autostart
  files are two lines: they run the Node startup app, and that app is what
  calls `git pull` then `pnpm run build`. The new `startup.sh` cannot run
  until the boot after that pull.
- `pnpm-lock.yaml` is still lockfile 5.4. pnpm 7 that meets format 9 rewrites
  it and the dirty tree blocks every later pull.
- Target runtime is still Node 24 LTS (24.21.0) and pnpm 12.4.1. Do not follow
  `babybox-mono`'s pnpm 10; this repo goes to latest.
- Backend ESM, Express 5, oxlint + oxfmt, vitest everywhere, Vite 8, panel on
  TypeScript 6.0.3 because `vue-tsc` 3.3.11 still crashes on 7.0.2.

### Changed on main since 2026-09-12

| Change | PRs | What it does to this plan |
|---|---|---|
| `@babybox/config-schema` with `zod@3.23.8` | #86 | New package in the inventory. Already `module: node16` and `strict: true`. Backend imports the type only, through `baseUrl` + `paths`, because a `workspace:*` dep breaks the standalone `dist` install (learnings.md, Startup). TS 7 removes `baseUrl`; P4 must replace that path with a relative `paths` entry. Zod stays on 3.23.8 in this plan. Zod 4 is a separate project. |
| Config write path, PATCH, panel config page, apply-on-save | #85 #88 #89 #91 | Manual run in P4 includes the config page, PUT and PATCH. Express 5 now has 11 async route handlers (7 backend, 4 configer), not 9. Empty-body tests exist for PUT and PATCH; they still assume Express 4's `req.body = {}` when the header is missing. |
| Startup logs through pino, not winston | #90 | Startup depends on `pino@^8.21.0` and `pino-pretty@^10.3.1`, with a fallback when `require("pino")` fails so a boot after a failed install still runs. `bootstrap.js` stays dependency-free. Do not upgrade pino until Node 24 (P4). The Czech one-line file format from #90 is a constraint, not a nice-to-have. |
| Startup has tests | #90 | `apps/startup/src/logger.test.js` runs under jest. P0 must not remove jest from startup. P5 moves those tests to vitest and puts them in CI. CI today lints startup and does not test it. |
| `installAll.sh` removed | #54 | Ubuntu provisioning is `install-all.sh` only. Both `install-all.sh` and the old script used `n` and chowned `/usr/local`. |
| Panel no longer imports axios | #76 | `axios` is still in `apps/panel/package.json` and the leftover `apps/panel/pnpm-lock.yaml`. Dead weight for P0. Backend still has one axios call site. |
| Panel lodash is deep imports | #71 | `lodash/isEqual`, `cloneDeep`, `throttle`. Lodash 4.18.1 is still the bump. |
| CI already matches the box | #77 | Node 18.12.1, pnpm 7.5.0, `pnpm install --frozen-lockfile`, lint, `build:schema`, panel/backend/configer build, tests. A comment claims `versions.env` exists. The file is not on `main`. No Node 24 job. No legacy-image job. |
| `decisions.md` and `learnings.md` exist | #85 | Copy the 2026-09-12 upgrade decisions into `decisions.md` in P0. Panel typecheck is 20 errors, not 17, measured at 1927135; #89 and #91 landed after, so re-count at the start of P4. |
| GET `/status` exists | #80 | Backend and configer both return `{ msg: "Alive." }`. P0/P1 extend those bodies. They do not add new routes. |
| Root `build` already builds the schema | #86 | `"build": "pnpm install && pnpm run build:schema && …"`. `bootstrap.js` still goes in front of `pnpm install`. |

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

- The `versions.env` format and comments (NODE, PNPM, PM2, N).
- `install-all.sh` reading those values instead of five hard-coded copies.
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
(the first jump), and the shell `ensure_*` functions (every later boot, and
the two-boot fallback). Both read `versions.env`.

## Why now

- Node 18 reached end of life on 2025-04-30. No security fixes since.
- Most of the toolchain we are behind on now refuses Node 18: Vite 7+, Vitest 4+,
  ESLint 10, jsdom 21+, oxlint, oxfmt.
- pnpm 7.5.0 cannot reach the registry from Node 20+, so every developer machine
  already needs a workaround to install.
- The panel typecheck is red with 20 pre-existing errors (last counted at
  1927135) and the build's type gate checks zero files. Newer `vue-tsc` and
  `@vue/tsconfig` are how that gets fixed.

## What exists today

### Runtime and package manager

| Piece | Today | Pinned where |
|---|---|---|
| Node on Ubuntu boxes (half the fleet) | 18.12.1 via `n`, `/usr/local` chowned to the user | `install-all.sh` (`NODE_VERSION`), `.github/workflows/ci.yml`. `apps/startup/versions.env` is named in the CI comment and does not exist. |
| Node on Windows boxes (other half) | installed by hand with nvm-windows, "mimicking" 18.12.1; OS is Windows 7, 8, 10 or 11 | nowhere; `install.bat` only checks `node -v` |
| pnpm | 7.5.0, lockfile `5.4` | `install-all.sh`, `install.sh`, `install.bat`, `src/logic/install/{ubuntu,windows}.js`, root `packageManager`, `ci.yml` |
| pm2 | `@latest` at install time | `src/logic/install/*.js` |
| Global `typescript@4.7.4`, `ts-node@10.9.1` | installed on every box | `src/logic/install/*.js`; unused by the build (the workspace `tsc` is used) |
| TypeScript in the workspace | `^4.7.4` (root, panel, backend); configer and config-schema use the workspace `tsc` | each `package.json` that lists it |

### How a box updates

On every boot the desktop autostart runs `apps/startup/scripts/ubuntu/startup.sh`
(two lines: `cd` into startup, `pnpm run start --ubuntu`) or the Windows
`startup.bat` (`cd ../../`, `pnpm run start`). That is `node src/index.js`
**from the git checkout**. That process (`src/logic/start/ubuntu.js`) does:

1. `git pull` in `source/`. Empty stdout or any stderr counts as failure.
2. If the pull changed something: `pnpm run build` in `source/`. That runs the
   `build` script from **HEAD's** root `package.json`: `pnpm install &&
   build:schema && build panel && build backend && build configer`. Any stderr
   fails the build.
3. On success: swap `dist`, `pnpm install` inside `dist`, restart both apps under pm2.
4. On failure: keep the old `dist`, start the old apps. Try again next boot.

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

The startup app cannot upgrade Node or pnpm today.

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
   apps/startup/bootstrap.js && pnpm install && ..."`. The legacy startup runs this on
   boot one, before pnpm 7 ever touches the lockfile. `bootstrap.js` compares
   `node -v`, `pnpm -v`, `pm2 -v` with `versions.env`, installs what differs (`n` on
   Ubuntu, `npm install -g pnpm@…`, `pm2 update`), and exits 0. The `pnpm install`
   that follows in the same `&&` chain is a fresh process and resolves to the new pnpm
   binary from `PATH`; `vite build` and `tsc` start on the new Node. One boot.
2. **The new startup app as fallback, plus shell `ensure_*`.** If the bootstrap could
   not run (bad permissions, no network for `n`), the build fails, the old apps
   start, and on the next boot HEAD's `startup.sh` / `startup.bat` and the Node
   startup app run on the old Node with the old `node_modules`. They repeat the
   bootstrap with better logging and a `git checkout -- pnpm-lock.yaml` before
   the pull, so a dirtied tree self-heals. Two boots. The shell functions are
   what the unmerged pinning branch already drafted; they do not replace (1).

### Windows boxes

Half the fleet. Facts that shape the bootstrap there:

- **Node 18 and later need Windows 10 or Server 2016** (Node's `BUILDING.md`, Tier 1
  row; Windows 8.1 was "experimental" in 18 and is gone in 24; Windows 7 was last
  supported by Node 13). So a Windows 7 or 8 box cannot run Node 24, and most likely
  is not running 18.12.1 today either, whatever nvm-windows was asked for. These boxes
  cannot follow this plan on their current OS. Confidence high on the support matrix,
  medium on what they actually run; the `GET /status` fields from P1 will tell.
- **nvm-windows keeps global packages per Node version.** After `nvm use 24`, `pnpm`,
  `pm2` and `nodemon` are gone until reinstalled. The bootstrap reinstalls them after
  every switch, in that order.
- **`nvm use` rewrites a symlink under Program Files and needs elevation.** The startup
  runs from the user's Start Menu autostart. Whether `nvm use` succeeds without a UAC
  prompt on the boxes (admin user, UAC off, or `sudo-prompt` already in the startup's
  dependencies) has to be tested on one Windows 10 box before P1 lands. A UAC prompt
  on a kiosk with nobody in front of it is a hung update.

What the bootstrap does on Windows:

1. Windows 10 or 11: `nvm install <NODE_VERSION>`, `nvm use <NODE_VERSION>`, then
   `npm install -g pnpm@… pm2@…`, then `pm2 update`. Same contract as Ubuntu.
2. Windows 7 or 8: **do not attempt Node.** Log the OS and the Node version, switch
   the checkout to the `legacy` branch (`git checkout legacy`), exit 0. From then on
   the box pulls only that branch, which holds the last commit before P2 plus any
   backport we choose to make. One boot, automatic, no dirty tree, and the box keeps
   working. Getting such a box onto this plan means a new OS on site: Windows 10/11 if
   the hardware allows, or Ubuntu via `install-all.sh`.

Decision needed from the owner: is parking Windows 7/8 boxes on `legacy` acceptable,
and is there a plan to reinstall them? Until then the `legacy` branch is a supported
target and gets security backports only.

Rules that follow, and hold until the last legacy box is gone:

- `bootstrap.js` and everything in `apps/startup/src` run on the **oldest Node in the
  field**, not on Node 18. Until the inventory says otherwise, assume Node 12: no `??`
  or `?.`, no `fs/promises` import, CommonJS. They use **no dependency** that is not
  already in a legacy `node_modules`. Today that set is `fs-extra` 10, `moment`,
  `pino` 8, `pino-pretty` 10, `sudo-prompt` 9 — and pino is loaded through a
  try/catch because a failed `pnpm install` leaves it missing. `bootstrap.js`
  itself uses nothing. New syntax and new packages are for the other apps.
- The `legacy` branch and the `legacy-runtime` tag are never deleted. The offline
  tail is years.
- `bootstrap.js` writes only to stdout and a log file. `npm install -g` and `n` both
  chat on stderr; redirect it. Stderr fails the build.
- `bootstrap.js` is idempotent and fast when nothing differs; it runs on every update.
- `.npmrc` gets `frozen-lockfile=true`, so a pnpm that cannot read the lockfile
  errors out instead of rewriting it. Fail loud, stay clean. Today `.npmrc` only
  has `link-workspace-packages = true`.
- **CI proves the jump on every PR**, not a person on a spare box. A container with
  Node 18.12.1, pnpm 7.5.0 and a checkout of the tagged legacy commit runs the same
  two commands the legacy startup runs, `git pull` to the PR head and `pnpm run
  build`, and asserts: exit 0, empty stderr, clean tree, `node -v` and `pnpm -v`
  equal to `versions.env`. Windows gets the same check on a `windows-latest` runner
  with nvm-windows installed, for the Windows 10/11 path. The Windows 7/8 path is
  tested by faking the OS version and asserting the checkout ends on `legacy`.

Falsifier: the legacy-image job. If it fails, HEAD is not installable from a legacy
box and the PR does not merge.

### Packages: current → latest

Versions from `npm view` on 2026-09-13. "Node" is the package's own `engines.node`.
Latest numbers that did not move since 2026-09-12 are left as they were.

**Root (`source/package.json`)**

| Package | Now | Latest | Node | Note |
|---|---|---|---|---|
| typescript | ^4.7.4 | 7.0.2 | ≥16.20 | native compiler; see P6 |
| ts-node | ^10.9.1 | 10.9.2 | — | replace with `tsx` 4.23.13 (needs no TS JS API) |
| @types/node | ^18.11.18 | 24.13.4 (match runtime) | — | npm's absolute latest is 26.5.1; do not follow it. P3 installs `@types/node@24` |
| @types/cors, @types/express, @types/lodash.merge | | | | move to the apps that use them; root should hold nothing |

**`@babybox/config-schema`** (new since the first draft)

| Package | Now | Latest | Node | Note |
|---|---|---|---|---|
| zod | 3.23.8 (exact) | 4.6.4; latest 3.x is 3.25.76 | — | Pinned because 3.23.8 is the last 3.x before 3.25 started shipping v4 next to v3, and it compiles on TypeScript 4.7. **Stay on 3.23.8 in this plan.** Zod 4 rewrites the error API the schema already wraps. Out of scope. |
| vitest | ^0.9.3 | 5.0.0 | ^22.12 ‖ ^24 | with the rest in P5 |
| typescript | none (uses workspace `tsc`) | 7.0.2 | | already `module`/`moduleResolution: node16`, `strict: true`, `"types": []`. P6 can swap the binary. |

**Panel**

| Package | Now | Latest | Node | Note |
|---|---|---|---|---|
| vue | ^3.2.33 | 3.5.42 | — | minor line, low risk |
| vue-router | ^4.0.14 | 5.3.1 | — | v5 has no breaking change for us (no file-based routing); v6 will be ESM-only |
| pinia | ^2.0.13 | 4.0.3 | — | stores already use `defineStore("id", {…})`, which v3 kept. v4 is ESM-only and needs `@vue/devtools-api`, TS ≥5.6, vue ≥3.5.11. Vite bundles it. |
| axios | ^0.27.2 | — | | **unused** in panel `src/` (PR #76). Remove in P0. Do not upgrade. |
| howler | ^2.2.3 | 2.2.4 | — | last release 2023-09; works |
| lodash | ^4.17.21 | 4.18.1 | — | three deep imports (`isEqual`, `cloneDeep`, `throttle`) |
| moment | ^2.29.3 | 2.30.1 | — | project is in maintenance mode; 17 call sites; replacing it is out of scope |
| vite | ^2.9.5 | 8.3.0 | ^20.19 ‖ ≥22.12 | six majors; v8 is Rolldown-based, fallback is 7.3.6 |
| @vitejs/plugin-vue | ^2.3.1 | 6.0.8 | ^20.19 ‖ ≥22.12 | |
| vitest | ^0.9.3 | 5.0.0 | ^22.12 ‖ ^24 ‖ ≥26 | |
| jsdom | ^16.7.0 | 30.0.1 | ^22.22.2 ‖ ^24.15 ‖ ≥26 | the strictest Node floor in the repo |
| vue-tsc | ^0.38.2 | 3.3.11 | — | needs TS ≥5.0 **JS API**; not the TS 7 binary. Still 3.3.11. |
| @vue/tsconfig | ^0.1.3 | 0.9.1 | — | needs TS ≥5.8, vue ^3.4; 0.1.3 uses `moduleResolution: Node` and `preserveValueImports`, both removed in TS 7 |
| stylus | ^0.57.0 | 0.64.0 | ≥16 | 31 SFC style blocks |
| eslint | ^8.19.0 | 10.10.0 | ^20.19 ‖ ^22.13 ‖ ≥24 | flat config rewrite; see "Lint stack" |
| @typescript-eslint/* | ^5.30.5 | 8.70.0 | ≥18.18 | peer `typescript <6.1` |
| eslint-plugin-vue | ^9.1.1 | 10.11.0 | ≥18.18 | |
| @vue/eslint-config-typescript | ^11.0.0 | 14.9.0 | ≥18.18 | needs eslint ≥9.10 |
| @vue/eslint-config-prettier | ^7.0.0 | 10.2.0 | — | |
| eslint-plugin-prettier | ^4.2.1 | 5.5.6 | — | |
| eslint-plugin-simple-import-sort | ^7.0.0 | 14.0.0 | — | |
| eslint-plugin-unused-imports | ^2.0.0 | 4.4.1 | — | |
| @rushstack/eslint-patch | ^1.1.4 | 1.16.1 | — | not needed with flat config; remove |
| prettier | ^2.7.1 | 3.9.6 | ≥14 | |
| @types/jsdom, @types/howler, @types/lodash, @types/node | | 30.0.0, 2.2.13, 4.17.25, 24.13.4 | | |
| `apps/panel/pnpm-lock.yaml` | stale, format 5.4 | — | | leftover from before the workspace; delete |

**Backend**

| Package | Now | Latest | Node | Note |
|---|---|---|---|---|
| express | ^4.18.1 | 5.2.1 | ≥18 | see "Express 5" below |
| cors | ^2.8.5 | 2.8.6 | — | |
| dotenv | ^16.0.1 | 17.4.2 | ≥12 | v17 logs a banner on load; set `quiet: true` or it lands on stdout |
| lowdb | ^3.0.0 | — | | **unused** (no import anywhere); remove in P0 |
| moment | ^2.29.3 | 2.30.1 | — | |
| morgan | ^1.10.0 | 1.12.1 | — | |
| open | ^8.4.0 | 11.0.3 | ≥20 | ESM-only since v9; backend is CommonJS; see "ESM-only packages" |
| winston | ^3.8.1 | 3.19.0 | — | one file: `modules/restart.ts` |
| axios | ^0.27.2 | 1.20.0 | — | one call site, `fetch/fetch.ts` |
| jest, @types/jest | ^28.1.3 | 30.5.1, 30.0.0 | ≥18.14 | six test files; move to vitest in P4 |
| ts-jest | ^28.0.7 | 29.4.12 | — | peer `typescript <7` |
| newman | ^5.3.2 | 6.2.2 | ≥16 | |
| nodemon | ^2.0.19 | 3.1.14 | ≥10 | |
| @types/express, @types/cors, @types/morgan | | 5.0.6, 2.8.19, 1.9.10 | | `@types/express@5` for express 5 |
| @babybox/config-schema | tsconfig `paths` only | — | | must stay a type-only import. No `workspace:*` in this `package.json`. |

**Configer**

| Package | Now | Latest | Node | Note |
|---|---|---|---|---|
| express, cors, dotenv | as backend | as backend | | |
| lowdb | ^3.0.0 | 7.0.1 | ≥18 | `versions.json` only. `index.ts` still imports `JSONFile`/`Low` and does not use them; drop that import in P0. |
| lodash.merge, @types/lodash.merge | ^4.6.2, ^4.6.7 | 4.6.2, 4.6.9 | — | |
| vitest | ^0.9.3 | 5.0.0 | ^22.12 ‖ ^24 | |
| @babybox/config-schema | workspace:* | — | | built to `dist/` first; Node 18 cannot load `.ts` |

**Startup** (plain CommonJS JavaScript)

| Package | Now | Latest | Node | Note |
|---|---|---|---|---|
| fs-extra | ^10.1.0 | 11.4.0 | ≥14.14 | |
| moment | ^2.29.3 | 2.30.1 | — | |
| pino | ^8.21.0 | 10.3.1 | — | loaded through try/catch. Upgrade in P4 after Node 24. Keep the Czech one-line file + rotation from #90. |
| pino-pretty | ^10.3.1 | 13.1.3 | — | with pino |
| sudo-prompt | ^9.2.1 | 9.2.1 | — | last release 2024-12; no upgrade exists; still needed for Windows elevation |
| eslint, eslint-config-prettier, plugins, prettier | as backend | as backend | | removed in P5 |
| jest | ^28.1.3 | — | | **in use** (`logger.test.js`). Move to vitest in P5. Do not remove in P0. |

**Global on the boxes**

| Tool | Now | Target | Node | Note |
|---|---|---|---|---|
| Node | 18.12.1 | 24.x LTS (24.21.0 today) | | Node 22 is already in maintenance (ends 2027-04-30); 24 is Active LTS until 2026-10, maintained to 2028-04-30 |
| pnpm | 7.5.0 | 12.4.1 | ≥18 | runs on Node 18, so it can go first |
| pm2 | `latest` | 7.0.4 | ≥18 | pin it; `latest` on an unattended install is a risk we already carry |
| typescript, ts-node (global) | 4.7.4, 10.9.1 | remove | | nothing uses them |

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
specifiers, `import.meta.dirname` for `__dirname`, plain `import` for `open`,
`moment`, `winston`. `dist/package.json` is a copy of the backend's, so pm2 sees
`"type": "module"` too. Jest is the only CommonJS-shaped tool in the backend and
goes in the same phase. The config-schema `paths` entry must keep working as a
type-only import after the move.

**TypeScript 6 and 7.** 6.0 is the last JS-based release and exists to flag what 7
removes. Removed in 7, and present in this repo: `baseUrl` (panel `tsconfig.app.json`
and now the backend tsconfig, for `@babybox/config-schema`; use relative `paths`
without `baseUrl`), `moduleResolution: node10` (the backend gets it by default from
`module: CommonJS`, and `@vue/tsconfig` 0.1.3 sets `Node`), and
`preserveValueImports` / `importsNotUsedAsValues` (from `@vue/tsconfig` 0.1.3;
0.9 uses `verbatimModuleSyntax`). Also changed defaults in 6: `strict: true`,
`module: esnext`, `target: es2025`, `noUncheckedSideEffectImports: true`; the backend
has `noImplicitAny` only and would become fully strict — that is wanted, but it is a
fix-errors step, not a version bump. `import x = require()` and `enum` are not
deprecated. `tsc --build` and project references still work.

**TypeScript 7 has no stable JS API.** The `typescript@7` package is a 2.5 MB
launcher for a Go binary. Everything that today loads TypeScript as a library keeps
needing a 6.x: `vue-tsc` (Volar), `ts-jest` (peer `<7`), `ts-node`,
`@typescript-eslint/parser` (peer `<6.1`), vitest typecheck mode. **Tested
2026-09-12: `vue-tsc@3.3.11` crashes on `typescript@7.0.2`**
(`ERR_PACKAGE_PATH_NOT_EXPORTED` while resolving `tsc`) and works on `6.0.3`.
Re-checked 2026-09-13: `vue-tsc` latest is still 3.3.11. So the latest tooling that
can type-check `.vue` files is `vue-tsc` 3.3.11 on TypeScript 6.0.3; there is no
newer combination to pick. "TypeScript 7 everywhere it runs" therefore means: `tsc`
builds of backend, configer and config-schema on 7; dev runners on `tsx` (needs no
TS at all); tests on vitest (transforms with esbuild/oxc, no TS needed); the panel
keeps `typescript@6.0.3` as its own devDependency. pnpm gives each app its own
`typescript`, so this is a per-`package.json` choice. Re-test `vue-tsc` on 7 at
each Volar major; move the panel when it passes.

**Dev runners.** `nodemon` in the backend uses `ts-node` under the hood, configer uses
`nodemon --esm` (ts-node's ESM loader). Both go to `tsx`. Node 24 can also run `.ts`
directly, but only erasable syntax; the backend has 3 `enum`s and `import = require`,
so that is a later option gated on `erasableSyntaxOnly`.

**pnpm 10+.** Dependency lifecycle scripts do not run unless listed in
`onlyBuiltDependencies` (`pnpm approve-builds`). `esbuild` (via Vite) is the usual
one. Whether pnpm prints the "ignored build scripts" notice to stderr must be checked
on a box image, because stderr fails the update. Pin the version with
`devEngines.packageManager` (or keep `packageManager`); `link-workspace-packages`
default flipped to false in pnpm 9, our `.npmrc` already sets it explicitly.

**Vite 2 → 8.** Six majors. Our config is small (one plugin, one alias, a Stylus
import via `__dirname`, an outDir). Vite bundles the config with `__dirname` defined,
but `import.meta.dirname` is the forward-compatible spelling. Vite 7 moved the default
browser target to Baseline Widely Available (Chrome 107+, Safari 16+); the panel PCs
run a current Chromium, so no `build.target` override is needed unless a box proves
otherwise. Vite 8 has a compatibility layer for `rollupOptions` and `esbuild` options;
we use neither. **Decided 2026-09-12: go to 8.** If 8 misbehaves, `vite@7.3.6` with
`rolldown-vite` is the documented half-step, recorded here so nobody re-derives it.

**Lint stack. Decided 2026-09-12: oxlint + oxfmt, not ESLint 10.** The ESLint family
(`eslint`, `@typescript-eslint/*`, `eslint-plugin-vue`, `@vue/eslint-config-*`,
`eslint-plugin-prettier`, `eslint-plugin-simple-import-sort`,
`eslint-plugin-unused-imports`, `@rushstack/eslint-patch`, `prettier`) is removed, not
upgraded. `oxfmt` covers formatting and import sorting; `oxlint` with the `import`,
`promise`, `node`, `unicorn` and `vitest` plugins covers the rules we use today, and
`oxlint-tsgolint` adds the type-aware rules. Both need Node ≥20.19, so they land after
P3. Latest on 2026-09-13: `oxlint@1.82.0`, `oxfmt@0.67.0`. Configer goes first as its
own PR (strict TypeScript flags, tracked suppressions, CI gate), then the same config
is copied to the other apps. `.oxlintrc.json` and `.oxfmtrc.json` live once, at
`source/`, with per-app overrides. Config-schema is a fifth target, not listed in the
first draft.

**Pino 8 → 10.** Startup's public log is a Czech one-line file with size rotation
(#90, decisions live in that PR). `pino@10` and `pino-pretty@13` change the default
shape. Upgrade only after Node 24, in the P4 library PR, and treat a broken log
format as a failed phase. `bootstrap.js` never imports pino.

**Zod.** Leave at `3.23.8`. A bump to 3.25 or 4 is not this project.

## Phases

Order is fixed by the box update path: the bootstrap first, because every later
commit depends on it being in HEAD; then the runtime versions it installs; then
everything that needs the new runtime. Phases are for review size and for finding
what breaks, not for the boxes. Each phase must pass the legacy-image job on its own.

### P0 — Make the plan checkable

- [ ] Tag the current `main` as `legacy-runtime`. That is the state the CI job
      upgrades from, forever. Tag after this plan merges, so the tag includes
      #85–#91.
- [ ] CI: legacy-image job (see "Upgrading from any older version"). At P0 it only
      asserts the two legacy commands still succeed against the PR head; the version
      assertions are added in P2 and P3.
- [ ] Add `engines.node` to every `package.json` (including config-schema) and
      `engine-strict=false` on purpose, so a mismatch prints, never blocks, on a box
- [ ] Fill `apps/startup/versions.env` with `NODE_VERSION`, `PNPM_VERSION`,
      `PM2_VERSION`, `N_VERSION`, and read them from `install-all.sh`, `install.sh`,
      `install.bat`, `src/logic/install/*.js` and `ci.yml` instead of five hard-coded
      copies. Reuse the file from the unmerged pinning branch. The CI comment that
      already names this file becomes true.
- [ ] `.npmrc`: add `frozen-lockfile=true` next to `link-workspace-packages = true`
- [ ] CI: add a second job on Node 24 that runs install, build and tests but is
      allowed to fail. It shows what breaks per phase before the boxes move. The
      existing Node 18 job stays as the gate until P3.
- [ ] Extend the existing `GET /status` bodies on configer and the backend with
      `node -v` and `pnpm -v`. Do not add a new route.
- [x] Lint stack decided: oxlint + oxfmt (see "Decisions taken")
- [ ] Remove dead weight: `lowdb` from the backend, `axios` from the panel, the
      unused `lowdb` import in `configer/src/index.ts`, global `typescript` and
      `ts-node` from the install scripts. **Do not remove jest from startup.**
- [ ] Copy the 2026-09-12 upgrade decisions from the table below into
      `decisions.md`. That file exists now.

Size: ~0.5 day.

### P1 — HEAD bootstraps the runtime from legacy

At P1 `versions.env` still says Node 18.12.1 and pnpm 7.5.0, so the bootstrap is a
no-op on every box. The phase ships the mechanism and proves it; P2 and P3 change
the numbers.

- [ ] `apps/startup/bootstrap.js`: dependency-free, oldest-field-Node syntax
      (assume 12 until the inventory says otherwise), reads `versions.env`,
      compares `node -v` / `pnpm -v` / `pm2 -v`, installs what differs, stdout
      and a log file only, exit 0 when nothing to do
- [ ] Ubuntu: Node via `n` (already used by `install-all.sh`; `/usr/local` is chowned
      to the user there), pnpm and pm2 via `npm install -g`, then `pm2 update` so the
      daemon runs on the new Node before it spawns the apps. Confirm pm2 spawns the
      apps with the new `node`, not the daemon's old `process.execPath`. Harvest
      `ensure_node` / `ensure_pnpm` / `ensure_pm2` from the unmerged pinning branch
      into `startup.sh`, and probe `pino` not `winston` if `deps_ok` comes along.
- [ ] Windows 10/11: `nvm install` + `nvm use` from nvm-windows, then reinstall
      `pnpm`, `pm2`, `nodemon` globally (nvm-windows keeps globals per version), then
      `pm2 update`. Same harvest into `startup.bat`.
- [ ] Windows 7/8: detect the OS version, log it, `git checkout legacy`, exit 0
- [ ] Create the `legacy` branch from the last commit before P2 and protect it
- [ ] Test on one Windows 10 box: does `nvm use` succeed from the autostart context
      without a UAC prompt? If not, decide between `sudo-prompt` (already a dependency)
      and a one-time on-site change, before P1 merges
- [ ] Root `package.json`: `"build": "node apps/startup/bootstrap.js && pnpm install
      && …"` in front of the existing `build:schema` chain
- [ ] Startup app: run the bootstrap again before its own `git pull`, after a
      `git checkout -- pnpm-lock.yaml` and with a working tree check; log the outcome
      to `logs/startup.bootstrap.log`
- [ ] Startup app: report `node -v`, `pnpm -v`, last bootstrap result on the
      existing `GET /status` (or a small file the panel can show)
- [ ] Legacy-image job runs the P1 head and stays green (no-op path)
- [ ] Legacy-image job runs the P1 head with a `versions.env` override to Node 24 and
      pnpm 12 and asserts the versions changed. This is the real proof; it runs on
      every PR from here on.
- [ ] Ubuntu: `install-all.sh` installed Node with `n` and chowned `/usr/local` to
      the user, so `n <version>` works without sudo on every Ubuntu box. The
      bootstrap still checks it is writable and logs if not. `installAll.sh` is
      gone (#54); do not mention it in new code.

Size: ~2.5 days, of which Windows is one. No fleet round-trip is required before the
next phase, because the legacy-image job replaces it. Watch the `GET /status` fields
anyway; they are the only inventory of what Node the Windows boxes actually run.

### P2 — pnpm 7.5.0 → 12.4.1

- [ ] `PNPM_VERSION=12.4.1` in `versions.env`; CI `pnpm/action-setup` follows it
- [ ] Root `packageManager` / `devEngines.packageManager` updated
- [ ] Regenerate `pnpm-lock.yaml` with pnpm 12 (format 9); delete
      `apps/panel/pnpm-lock.yaml`
- [ ] `pnpm approve-builds` for whatever needs scripts today (expect `esbuild`)
- [ ] Verify on the box image that `pnpm install` inside `pnpm run build` prints
      nothing on stderr. If it does, either silence it (`--reporter`, config) or
      change the startup's stderr rule to a non-empty-exit-code rule, and record why
- [ ] `pnpm audit` baseline recorded in this file
- [ ] Legacy-image job asserts `pnpm -v` = 12.4.1 after `pnpm run build`, and that
      the tree is clean (pnpm 7 with `frozen-lockfile=true` must not have rewritten the
      lockfile before the bootstrap replaced it)

Size: ~0.5 day. Must be the same PR as, or a later PR than, P1: a lockfile in
format 9 on `main` without the bootstrap in the `build` script is exactly the
"dirty tree, no more pulls" failure.

### P3 — Node 18 → 24 on the boxes and in CI

- [ ] `NODE_VERSION=24.x` (latest 24 LTS at the time; 24.21.0 on 2026-09-13) in
      `versions.env`; CI follows
- [ ] `@types/node` → 24.x everywhere (24.13.4 today, not 26.x); remove the root
      copy if no root code needs it
- [ ] pm2 → 7.0.4 pinned
- [ ] Legacy-image job asserts `node -v` = the pinned 24.x after `pnpm run build`
- [ ] The Node 24 CI job from P0 becomes the only build job; the legacy-image job
      stays

Size: ~0.5 day.

### P4 — TypeScript 4.7 → 6.0.3 and the libraries

Still the JS compiler, so `vue-tsc`, `ts-jest`, `typescript-eslint` keep working.
Fix everything TS 6 deprecates, so P6 is a swap of the binary, not a migration.

- [ ] `typescript@6.0.3` in root, panel, backend; configer and config-schema use
      the workspace `tsc` (or their own 6.0.3, then 7 in P6)
- [ ] Backend to ESM: `"type": "module"`, tsconfig `module`/`moduleResolution:
      node16`, `.js` on relative imports, `import.meta.dirname`, drop every
      `import x = require()`; accept `strict: true` and fix what it finds; the 6
      jest test files move to vitest in the same PR because ts-jest is the last
      CommonJS tool; replace `baseUrl` with a relative `paths` entry for
      `@babybox/config-schema` so TS 7 can drop `baseUrl`
- [ ] Panel: `@vue/tsconfig@0.9.1`, `vue-tsc@3.3.11`, remove `baseUrl`, make `paths`
      relative, fix the known typecheck errors (re-count first; 20 at 1927135),
      make `pnpm build` actually run the type gate over `src` (learnings.md says
      it checks zero files today)
- [ ] Configer: confirm with `tsc --noEmit`. Config-schema: confirm the same; it
      is already on `node16` / `strict`
- [ ] `ts-node` → `tsx@4.23.13` for `nodemon` in backend and configer
- [ ] vue 3.5.42, vue-router 5.3.1, pinia 4.0.3 + `@vue/devtools-api`, lodash 4.18.1,
      howler 2.2.4, moment 2.30.1, stylus 0.64.0
- [ ] axios 1.20.0 in the backend only
- [ ] express 5.2.1 + `@types/express@5` in backend and configer; add a JSON error
      middleware to both; extend the empty-body and missing-Content-Type tests for
      `undefined` as well as `{}`
- [ ] cors, dotenv 17 (`quiet: true`), morgan, winston, fs-extra 11, nodemon 3,
      newman 6, pino 10.3.1, pino-pretty 13.1.3 (prove #90's file format and
      rotation still hold)
- [ ] `open@11` as a plain ESM import once the backend is ESM
- [ ] lowdb 7 in configer (`versions.json` only)
- [ ] Full manual run: panel against a real engine and thermal unit, camera feed,
      sound alerts, settings page, restart route, config page save (PUT and PATCH
      from #85/#88/#91)

Size: ~2.5 days. The backend ESM conversion, express 5 and the panel typecheck are
most of it. Pino is extra compared to the first draft; it is small next to those.

### P5 — Test and lint toolchain

- [ ] vite 8.3.0, @vitejs/plugin-vue 6.0.8, vitest 5.0.0, jsdom 30.0.1 in the panel;
      `vite.config.ts` to `import.meta.dirname`
- [ ] vitest 5 in the backend (moved in P4), configer, config-schema and startup;
      `jest`, `ts-jest`, `@types/jest` removed everywhere; note the 2026-09-11
      decision that accepted two runners as superseded. Put startup tests in CI.
- [ ] oxlint 1.82.0 + oxfmt 0.67.0 (or latest at the time): configer first (its own
      PR, with the strict TypeScript flags and tracked suppressions), then panel
      (`vue` plugin), backend, startup, config-schema
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
      major and move when it passes
- [ ] Remove any `ignoreDeprecations` left from P4
- [ ] TS 7 pulls a platform binary (`@typescript/typescript-linux-x64`,
      `-win32-x64`); the legacy-image job on Linux and the Windows runner both confirm
      one resolves from the lockfile with `pnpm install --frozen-lockfile`

Size: ~0.5 day.

### P7 — Keep it that way

- [ ] Add Renovate or Dependabot with grouped, weekly PRs; CI on Node 24 and the
      legacy-image job are the gate
- [ ] `pnpm outdated` and `pnpm audit` in the CI summary
- [ ] Decide when the legacy bootstrap may go: only when `GET /status` from every
      known box shows the new runtime, or a box is written off. Until then the
      `legacy-runtime` tag and the job stay. Record the date in decisions.md.
- [ ] Update `CLAUDE.md`, `README.md`, and the "Known constraints" section of
      [config-ui.md](config-ui.md) (it still says TypeScript 4.7, Vite 2, Node 18,
      and 20 panel typecheck errors)

Size: ~0.5 day.

---

## Total

Roughly **9 to 10 focused days**. No phase waits on the fleet, because the
legacy-image job proves each commit is reachable from a legacy box. What does take
calendar time is the tail: the bootstrap stays in HEAD for years, and the Windows 7/8
boxes need a new OS on site before they can leave the `legacy` branch.

A cut-down version that removes the security exposure and unblocks tooling is P0
through P4 with TypeScript 5.9.3 instead of 6.0.3, about 4.5 days. It stops short of
"latest" for TS, Vite and the test runner, which is where most of the migration risk
sits.

## Known constraints

- The box update path treats any stderr from `pnpm run build` as a failure. Every
  phase is verified by the legacy-image job (Node 18.12.1 + pnpm 7.5.0 + the
  `legacy-runtime` checkout) before it lands on `main`.
- `apps/startup` and `bootstrap.js` stay on the oldest field Node's syntax (assume 12)
  with no new dependencies until the last legacy box is gone. They are the code that
  runs on the old runtime. Pino is already in startup; `bootstrap.js` still uses
  none of it.
- Half the fleet is Windows. Every startup and bootstrap change is tested on both.
- `pnpm@7.5.0` cannot reach the registry on Node 20+ (learnings.md). Until P2 lands,
  lockfile changes are made from a Node 18 shell.
- `configs/main.json` persists across updates. No phase changes its on-disk shape.
- All UI text is Czech; version bumps must not alter rendered text (moment locale,
  number formatting, startup log lines).
- `moment` stays. It works, and 17 call sites are a separate, smaller project.
- The backend `dist` is installed standalone. No `workspace:*` in the backend
  `package.json`. Config-schema stays a type-only import.
- Zod stays at 3.23.8. Zod 4 is out of scope.
- `@types/node` follows the runtime major (24), not npm's latest (26).

## Decisions taken (2026-09-12, owner)

Copy into decisions.md in P0. `decisions.md` exists as of #85.

| Question | Answer | Consequence |
|---|---|---|
| Windows boxes in the field? | Yes, half the fleet, Windows 7/8/10/11, nvm-windows, installed by hand | Windows bootstrap path in P1; Windows 7/8 cannot run Node ≥18 and are parked on `legacy` |
| Ubuntu provisioning? | `installAll.sh` (old) and `install-all.sh` (new); both use `n` with `/usr/local` owned by the user | Ubuntu Node step needs no sudo. Amended 2026-09-13: `installAll.sh` is gone (#54); only `install-all.sh` remains. The `n` + chown fact is unchanged. |
| Offline tail? | Months, sometimes years | Bootstrap stays in HEAD indefinitely; `legacy` branch and `legacy-runtime` tag are permanent |
| Backend and ESM-only packages? | Convert the backend to ESM | P4 grows by ~0.5 day; `open@11` becomes a plain import |
| Backend tests? | vitest | jest, ts-jest, @types/jest removed; one runner. Startup tests join in P5. |
| Lint stack? | oxlint + oxfmt | ESLint and Prettier family removed, not upgraded; configer first |
| Volar on TypeScript 7? | Not required, use the latest tooling | Tested: `vue-tsc` 3.3.11 crashes on TS 7.0.2, works on 6.0.3. Still the latest Volar on 2026-09-13. The latest working tooling for the panel is TS 6.0.3; backend, configer and config-schema build with TS 7 |
| Vite 8 or hold at 7? | Upgrade | Vite 8.3.0; 7.3.6 + `rolldown-vite` only as a documented fallback |

## Open questions

- [ ] Windows 7/8 boxes: is parking them on the `legacy` branch acceptable, and is
      there a plan to reinstall them (Windows 10/11 or Ubuntu) on site? Until answered,
      `legacy` is a supported branch with security backports only.
- [ ] Does `nvm use` run without a UAC prompt from the autostart context on the
      Windows 10/11 boxes? Test on one box before P1 merges.
- [ ] What Node do the Windows boxes actually run? nvm-windows "mimicked" 18.12.1, but
      Node 18 does not install on Windows 7/8. Sets the syntax floor for
      `bootstrap.js`; assumed Node 12 until known.

## Progress log

One line per landed step: date, PR, what moved.

- 2026-09-12 — plan written; nothing landed.
- 2026-09-12 — owner answered the open questions; Windows path, backend ESM, vitest,
  oxlint + oxfmt, Vite 8 recorded. `vue-tsc` on TS 7 tested and ruled out.
- 2026-09-13 — plan reviewed against `origin/main` (`cee4df0`, #91). Jump design
  kept. Inventory updated for config-schema, pino, CI, dead axios, startup tests,
  and the unmerged pinning branch. No upgrade code landed.
