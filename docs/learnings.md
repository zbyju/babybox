# Learnings

Things that cost us time once. Read before you touch the repo. Add one line per
lesson: what happened, what to do instead.

## Tooling

- **Never run the machine's pnpm here.** It rewrites the lockfile format. Use
  `npx pnpm@7.5.0`. CI and every babybox install with `--frozen-lockfile` from that
  version; a lockfile in another format means the box does not start.
- **The panel build type-checks `src`, and only `src`.** Its gate is
  `vue-tsc --noEmit -p tsconfig.app.json`, 99 files. Until the panel contract it ran
  `vue-tsc --noEmit` on the solution `tsconfig.json` (`files: []`) and checked none,
  while `typecheck` was red with 20 errors. The tests and `vite.config.ts` are
  checked by `typecheck` in CI, not on the box. Prove a gate with `--listFilesOnly`,
  not with a green run.
- **The startup app treats any stderr from `pnpm run build` as a failed build.**
  A warning printed by `tsc` or a package script fails the update on the box.
- **TypeScript 6 loads no `@types` package by itself.** Name what a unit needs
  in `types`: `["node"]` in the backend and configer, `[]` in config-schema.
  TypeScript 4.7 loaded every `@types` folder it found, `bun-types` from a
  parent `node_modules` included (TS1005/TS1139 noise).
- **TypeScript 6 fails an emit with `outDir` and no `rootDir`** (TS5011).
  `tsc --noEmit` does not show it. Build once before you call a unit green.
- **TypeScript 6 `tsc --build` writes `tsconfig.tsbuildinfo`** and then skips
  a project it thinks is up to date. The backend builds with plain `tsc`.
- **`verbatimModuleSyntax` keeps an unused value import in the emitted JS.**
  A type needs `import type`, and an unused import has to go, or the `dist`
  imports it at run time.
- **Port 5000 on macOS is AirPlay** (`ControlCenter`), so the backend cannot
  listen there on a Mac. Start a `dist` in Docker (`node:18.12.1-bullseye`
  is arm64) to check `GET /status`.
- **pnpm 7.5.0 cannot reach the registry on Node 20+** (`ERR_INVALID_THIS` from
  undici). Run it under Node 18 through npx instead:
  `npx -y -p node@18.12.1 -p pnpm@7.5.0 pnpm install` from `source/`. npx puts a
  Node 18 binary first on PATH and pnpm's shebang picks it up. Checked 2026-09-12.
- **Nothing formats configer, so prettier rewrites lines nobody touched.** CI lints the
  backend, the panel and startup only, and the one `.prettierrc.json` belongs to the
  panel. Format the lines you added by hand, or check the diff after prettier and put
  the untouched lines back.
- **`pnpm view` is not a test of the above.** It shells out to the machine's npm, which
  fails under Node 18 with `tracingChannel is not a function`. Test with
  `pnpm install --lockfile-only` in a scratch folder.
- **TypeScript 4.7 cannot read `@types/bun` 1.4.2 or `@types/node` 24.13.4.**
  `bun-types` gives TS1005 and TS1139 parse errors, and `skipLibCheck` does not
  hide a parse error. Check the package's `ts4.x` dist-tag before a types bump.
  The `@types/bun` `ts4.7` tag is 1.1.5.
- **`tsc --build` skips a project it thinks is up to date.** A types bump in the
  backend exited 0 because nothing was rebuilt. Test a types bump with
  `tsc --build --force`.
- **`bun run` starts a bin with the first `node` on `PATH`.** Only with no `node`
  there does the bin run on Bun. The panel build then fails, see "Panel".
- **`composite` plus `vue-tsc -p` writes a `.tsbuildinfo` on every run.** A box
  build would dirty the tree. The panel tsconfigs have no `composite`; TypeScript 6
  accepts project references without it.
- **vite 2.9 reads the tsconfig, but passes only six fields to esbuild:** `target`,
  `jsxFactory`, `jsxFragmentFactory`, `useDefineForClassFields`,
  `importsNotUsedAsValues`, `preserveValueImports`. `verbatimModuleSyntax` never
  reaches esbuild. The new panel tsconfigs on unchanged `src` gave a byte-identical
  bundle. vite also follows every reference of `tsconfig.json`, so a referenced
  tsconfig whose `extends` does not resolve fails the vite build.
- **zsh counts stderr wrong.** Its MULTIOS option copies a stream that is
  redirected twice, so `2>&1 >/dev/null | wc -c` counts stdout too. Measure stderr
  in bash.
- **`npx -p node@12.22.12` does not run on Apple silicon.** There is no darwin-arm64
  build of Node 12, and npx exits 1 with no message. Use the `node:12.22.12`
  Docker image for a Node 12 parse.

## Configer

- **`configs/main.json` is gitignored and persists across updates.** Its on-disk
  shape is the interface with every deployed box. Never change the format in a way an
  old file cannot be read.
- **`tsconfig.json` includes all of `src`.** Anything under `src` ends up in `dist`
  and is started by pm2. Exclude test files.
- **The db factory caches the init promise.** Each call to `mainConfig()` gets its
  own `data`. Two independent calls would drift apart the moment either one saw a
  PUT. Do not call it directly, use `DbFactory.getMainDb()`.
- **vitest 0.9.4 runs configer's ESM TypeScript with no config file.** vite 2
  resolves `./x.js` to `./x.ts`, which the backend tests rely on. A stale `x.js`
  next to `x.ts` wins, so delete compiled output that lands in `src`.
- **lowdb 3 already wrote a temp file and renamed it.** `JSONFile` goes through steno
  2.1.0, so a power cut could not leave a half-written `main.json`. What was missing was
  the `fsync` before the rename, a backup, and a boot that survives a corrupt file.
  Check the dependency's source before writing down why you replaced it.
- **`express.json()` sets `req.body = {}` when the Content-Type is not JSON.** A route
  that merges the body over defaults must reject an empty body, or a forgotten
  `-H 'Content-Type: application/json'` silently resets the config.
- **A test that starts from the defaults cannot tell which side the merge came from.**
  Change a second key first, then assert it went back to its default.
- **`lodash.merge` spreads a string source over the target** (`merge({}, "ab")` gives
  `{0:"a",1:"b"}`). Reject a non-object body before merging it over the defaults.
- **A stored value the schema rejects blocks every PATCH.** Boot only warns about one,
  so a box can be running on it, and a PATCH merges over that config and fails the
  check. The errors name the field, so a PATCH that sends a valid value for it gets
  through. Do not add a bypass; it would write a config nothing checked.
- **A stored key the schema does not know blocks every PATCH, and only a PUT clears
  it.** There is no value to send for it and `lodash.merge` cannot delete, so no PATCH
  body gets past the check. A PUT merges over `base.json`, not over the stored config,
  so the unknown key is simply not there. Do not strip unknown keys to make a PATCH
  succeed: that silently deletes what someone put in the file (mottos 1 and 2).
- **No write can remove a key.** PUT fills a missing key from `base.json`, PATCH keeps
  the stored value, and `lodash.merge` cannot delete. `app.refreshRequestLimit` is the
  only optional field and there is no way to clear it through the API.
- **`configer.port` and `configer.url` have no reader but configer.** The backend
  (`fetch/constants.ts`) and the panel (`api/base.ts`) have `localhost:5001/api/v1`
  compiled in, and `index.ts` reads the config only to bind. A stored change survives
  the restart, nothing follows it, and the backend then retries `fetchConfig()` for
  ever without reaching `app.listen` — in production that process serves the panel, so
  the box serves nothing. A write that moves either field is rejected. Check who reads
  a field before calling it restart-tier.
- **A no-op write costs the backup.** `write()` copies `main.json` over
  `main.json.bak` first, so saving the same config again replaces the one undo copy.
  The form saves with a PATCH every time, so `save()` returns early when the parsed
  config deep-equals the running one.

## Backend

- **`fetchConfig()` returns no `data` key when it fails.** It answers
  `{ status: 408, msg }`, so `config = (await fetchConfig()).data` sets `undefined`
  and the next poll throws on `config.units.engine.ip`. Check for the key before any
  assignment; boot's retry loop happens to survive it only because it loops on
  `!c.data`.
- **`prefix` is `config.backend.url || process.env.API_PREFIX`.** The prefix the
  process really serves may never have come from the config. Anything that compares
  a new config against "what we are running" has to compare against a value captured
  at listen time, not against `config.backend`.
- **The backend's tests used to land in `dist`.** Since the type contract its
  tsconfig excludes `src/**/*.test.ts`, as configer's does. A box still keeps the
  old `dist/__tests__/*.js`, because `tsc` does not clean `outDir`. Use
  `import type` for the schema in tests anyway, so nothing can import it for real.
- **Lint the backend before you build it in a clone.** eslint picks up
  `apps/backend/dist` once it exists, which produces phantom failures. CI lints
  before it builds, so it never sees them.
- **jest ran every backend test twice on CI, and this file said it did not.** CI's
  order is install, lint, build, grep, tests, so the jest step ran after `dist`
  existed and found both copies. The backend now runs vitest, whose default exclude
  has `**/dist/**`, and `dist` holds no test. Check the CI step order before writing
  down that a step never sees a build.
- **An ES module cannot call a namespace import.** `import * as express` then
  `express()` is TS2349 and a TypeError at run time. Use a default import for a
  CommonJS package (`express`, `cors`, `morgan`, `open`, `moment`, `winston`).
  `import * as` stays fine for `path`, `fs` and `dotenv`, whose members we call.
- **axios 0.27 is `axios.default` from an ES module.** Its types describe the
  CommonJS entry as `{ default }`. At run time `module.exports.default` is the
  same client. Back to `axios.get` with axios 1.x.
- **`__dirname` compiles and runs on Bun, and throws on Node 18 in an ES
  module.** `@types/node` declares it, and Bun defines it in ESM. The box's Node
  18 fallback then fails with `ReferenceError`. Use
  `path.dirname(fileURLToPath(import.meta.url))`.

- **Both servers answer every interface and every origin.** `app.listen(port, cb)`
  with no host binds `0.0.0.0` in the backend and in configer, and both mount
  `cors()` with no `origin`, so both send `Access-Control-Allow-Origin: *`. Anything
  that can route to the box can call any endpoint, and so can any web page open in a
  browser that can. Do not write down "only the LAN can reach it" without checking
  both of those.
- **Opening the doors is an unauthenticated `GET`.**
  `GET <prefix>/units/actions/opendoors` goes through `unitsRoute`, not
  `engineRoute`, and `Action` in `types/units.types.ts` is the whole list. Any
  argument about how much a config endpoint needs protecting has to be made next to
  this one.

## Startup

- **The backend's `dist` is installed standalone.** `startup` copies
  `apps/backend/dist` and `apps/backend/package.json` to the repo-root `dist/` and runs
  `pnpm install` there, outside the workspace. A `workspace:*` dependency in the
  backend's `package.json` breaks that install, so the backend can only share types.
- **After `git pull` the box runs the root `build` script**, nothing else. A new build
  step belongs there, or the box never runs it.
- **pm2 treats a Bun interpreter three ways.** 4.5.6 to 5.4.3 spawn
  `<bun> <script>` directly. 6.0.x wraps any path that contains `bun` in
  `ProcessContainerForkBun.js`. 7.0.4 wraps only a path that ends in `bun`, so it
  spawns `bun.exe` directly. All of them accept an absolute interpreter path.
- **Under Bun 1.4.2 `process.version` is `v26.3.0`.** The `node` field of
  `GET /status` shows that value when the app runs on Bun.
- **The legacy-image job never ran the old startup app.** It runs `git pull` and
  `pnpm run build` itself, then HEAD's startup app. Boot 1 with the old app had no
  test until `legacy-boot1`.
- **`pm2 -v` after `pm2 kill` prints `[PM2] Spawning PM2 daemon` first.** It
  starts the daemon. Read `pm2 jlist` from the first `[{` or `[]`, not from the
  first `[`.
- **A `.js` file under a `"type": "module"` package is ESM.** The legacy-image
  helper that runs `require("fs")` in `apps/backend` had to become
  `omit-dist-entry.cjs`. `node -e` code stays CommonJS.
- **`bun install --no-save` prints on stderr when the folder has `.env`.** Bun
  1.4.2 writes the `.env` load and the resolve lines there. Exit 0, the lock does
  not change. Without `.env` it prints nothing. A step that fails on stderr must
  not run it in `dist`.
- **Docker on Apple silicon runs the x64 image through rosetta.**
  `/proc/<pid>/exe` then points at `/run/rosetta/rosetta`, not at the real
  binary. The executable check in `assert-runtime.js` only holds on a real x64
  host such as CI.

## Process

- **A PR branch checked out in the main checkout cannot be committed to from a
  worktree.** Use a side branch and fast-forward push.
- **A test a brief asks for can invent the function.** The P3 brief asked for a test of
  "the diff between the loaded config and the edited config", so P3 shipped
  `changedPaths`. Nothing called it: `formState` already decides `changed` per field
  and returns the list, so the panel had the rule twice and the UI used the other copy.
  Review finding on the P3 PR; it is gone. Find the caller before you write the helper
  a test needs. What brings it back: nothing as written — a PATCH body that carries
  only the changed keys needs a nested partial builder, not a list of paths.

## Shared package

- **zod's strict object reports the unknown keys of one object as one issue.** It
  carries a `keys` array, so expand it into one error per key before anyone sees it.
- **`z.enum` needs an `errorMap` to carry a custom message.** `invalid_type_error`
  only covers a value that is not a string; a string outside the list is
  `invalid_enum_value` and keeps zod's own wording.
- **zod's `safeParse` returns a copy, built in the order the schema declares.** The
  written `main.json` follows the schema's key order, so declare the keys in the order
  `base.json` has them or every box rewrites its file on the first PUT.
- **Build the package before the configer or panel tests.** Both suites resolve
  `@babybox/config-schema` to its gitignored `dist/`, so on a fresh clone they cannot
  find it, and after an edit to `src/` they run against the previous build. Run
  `pnpm run build:schema` from `source/` first.

## Panel

- **The config store is set once at boot, so no field is "live".** `setConfig()` runs
  in `initializeConfig()` and nowhere else. A component that reads the store
  reactively still follows a value that never changes, and `BabyboxName.vue` copies
  its value into a const at setup. Before you call a field live, find the write that
  would update the store — there isn't one.
- **Check who reads a field before you write down its apply tier.** The config-ui
  plan carried a live tier of seven fields for two phases; every one of them was
  wrong. `configer.requestTimeout` is the other side of the same coin: it is in the
  schema, in `base.json` and on every box, and nothing in `source/` reads it.
- **`eslint --fix` on the whole panel is safe, CI's run is not.** CI runs eslint with
  no `--fix`, and `prettier/prettier` is an error, so an unformatted new file fails
  the build. `main` is clean, so running the `lint` script locally only rewrites the
  files you added. Check `git status` after it to be sure.
- **A client route of the panel only exists in production if express serves it.**
  The router is `createWebHistory()`, so `/config` is a real URL, and the backend
  served `express.static` plus `app.get("/")` and nothing else. A hard load of
  `/config` answered `Cannot GET /config`. Vite's dev server has an SPA fallback, so
  no amount of local testing shows it. Any phase that makes the browser load a client
  route by URL — a reload, a bookmark, a link from outside — has to check production.
- **`BaseButton` owns the action-button styles.** Import it wherever a coloured
  action is drawn. Its rules are scoped to `.base-button`, so a bare `button` is
  not restyled. `SettingsFormActions.vue` used to define a global `button` rule
  that only applied after that file loaded; a page that did not import it (the
  config page) had to copy the rules.
- **The panel's browser is always on the box.** `CONFIGER_API_URL` in `api/base.ts`
  and `backendApi()` both build `http://localhost:...`, compiled into the bundle. A
  browser on another machine loading the panel would resolve `localhost` to itself
  and never reach configer, so it fails at boot with "Config file error". The
  "remote maintenance" `CLAUDE.md` talks about is a remote session on the box, not a
  browser pointed at it. That is what makes a loopback bind safe to consider.

- **`vue-tsc` on the Bun runtime checks no `.vue` file.** It fails with TS2307
  "Cannot find module './App.vue'" and exit 2. BUILD_PANEL works because the
  runner runs on Node and `bun run` picks that `node`. Test the build with no
  `node` on `PATH` before anything removes Node from a box.
- **`vue-tsc` 3.3.11 does not start on Node 14.** `@volar/source-map` uses `??=`,
  a SyntaxError there. Node 16.20.2 and 18.12.1 pass. `vue-tsc` 0.38.9 ran on 14,
  so a box whose first `node` is 14 now fails BUILD_PANEL.
- **chai's `should` breaks Vue's `UnwrapRef` when tests share a program with store
  code.** vitest brings chai, which gives every object a `should` property. A
  Moment inside a pinia store then no longer matches its own type. 13 of the 20
  old panel errors were this. `vitest.env.ts` adds chai's `Assertion` to
  `RefUnwrapBailTypes` on `@vue/reactivity`. That needs `@vue/reactivity` as a
  direct devDependency: Bun does not link it into the panel, and vue 3.2.37 does
  not re-export the interface.
- **`skipLibCheck` also skips our own `.d.ts` files.** As `vitest.env.d.ts`, a
  wrong `Chai` name was not reported on its line. The bail type turned into
  `any`, and the only error was a TS7006 in `appStateStore.ts`. Write such a file
  as `.ts` with `export {}`, so the compiler checks it.
- **Vue 3.2 DOM types reject `undefined` under `exactOptionalPropertyTypes`.**
  `:src="url || undefined"`, `:pattern="maybe"` and a style object with an
  `undefined` value are errors. Leave the attribute off with `v-bind` of an object
  that lacks the key. Never write `pattern=""`: an empty pattern rejects every
  value that is not empty.
- **vue-router 4.1.3 on vue 3.2.37 does not type-check `<router-link>` props.** It
  extends `GlobalComponents`, which vue 3.2.37 does not have, so `:to="12345"`
  passes the gate.

- **Nothing in the panel may block the event loop.** `App.vue` heartbeats the backend
  every 5s and `restart.ts` reboots the machine after 9 missed ticks, so a
  `window.confirm`, an `alert` or a sync XHR reboots the box in about three minutes.
  Ask in the page instead; `ConfigForm.vue` does it with a two-step Save.

## Tests

- **`fetch` on Node 18 refuses a request that sets `connection`.** undici calls it an
  invalid connection header and the call fails with `TypeError: fetch failed`; Node 24
  forwards the header, so a test written on Node 24 only goes red on CI. Let the agent
  manage the connection and close the server with `closeAllConnections()`.
- **jest 28's node environment does not expose the global `fetch`** that Node 18 has.
  A backend test that needs an HTTP client uses `axios`, which the backend already
  depends on, or `node:http` directly.
- **A backend route that reads `index.ts` needs `vi.doMock("../../index.js")`.**
  Importing `index.ts` for real starts the whole server, `main()` runs on import.
  Call `vi.resetModules()`, mock it and the route's own `fetchConfig`, then
  `await import("../reloadRoute.js")` and mount the router on a bare express app.
- **vitest 0.9.4 cannot run on the Bun runtime.** `bun --bun vitest run` fails on
  `node:v8` `takeCoverage`. Run it on Node, as `bun --filter … test` does.
- **vitest 5 needs vite 6.4 or newer, and it must be a direct dependency.** Without
  it Bun links the panel's vite 2.9.14 and vitest crashes. A non-frozen install
  prints a peer warning on stderr. With vite 8.3.0 it fails on Node 18.
- **The panel's vitest run is `--environment jsdom`, so `sessionStorage` is there.**
  A test of it has to `sessionStorage.clear()` between cases; the store is shared
  across the file.
- **A `vi.mock` factory cannot close over a `const` of the test file.** vitest hoists
  the `vi.mock` call above the imports and runs the factory when the mocked module is
  first pulled in, which is before the `const` exists. Build the `vi.fn()` inside the
  factory, import the mocked symbol normally and take it back with `vi.mocked(...)`.
  vitest 0.9.4 has `vi.mocked`; it has no `vi.hoisted`.
