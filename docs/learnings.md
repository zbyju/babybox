# Learnings

Things that cost us time once. Read before you touch the repo. Add one line per
lesson: what happened, what to do instead.

## Tooling

- **Never run the machine's pnpm here.** It rewrites the lockfile format. Use
  `npx pnpm@7.5.0`. CI and every babybox install with `--frozen-lockfile` from that
  version; a lockfile in another format means the box does not start.
- **A green panel typecheck is a CI step, not the box `build`.** `pnpm typecheck`
  on the panel runs `vue-tsc -p tsconfig.app.json`. The box `build` script must not
  gain that command until it stays green: boxes run `pnpm build` with nobody there,
  and a red typecheck would stop the update. The old `vue-tsc --noEmit` in `build`
  used `tsconfig.json` with `"files": []` and checked nothing.
- **The startup app treats any stderr from `pnpm run build` as a failed build.**
  A warning printed by `tsc` or a package script fails the update on the box.
- **`tsc` picks up `bun-types` from a parent `node_modules`** (TS1005/TS1139 noise).
  A package that needs no ambient types sets `"types": []` in its tsconfig, as
  config-schema does. The backend needs Node types, so pass
  `--typeRoots ./node_modules/@types` there.
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

## Configer

- **`configs/main.json` is gitignored and persists across updates.** Its on-disk
  shape is the interface with every deployed box. Never change the format in a way an
  old file cannot be read.
- **`tsconfig.json` includes all of `src`.** Anything under `src` ends up in `dist`
  and is started by pm2. Exclude test files.
- **The db factory caches the init promise.** Each call to `mainConfig()` gets its
  own `data`. Two independent calls would drift apart the moment either one saw a
  PUT. Do not call it directly, use `DbFactory.getMainDb()`.
- **vitest 0.9.4 runs configer's ESM TypeScript with no config file**, but vite 2 does
  not resolve a `.js` import specifier to a `.ts` file. Import without the extension in
  `*.test.ts`; the rest of `src` keeps `.js` because `tsc` runs with `module: node16`.
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

- **`fetchConfig()` fails as `{ ok: false }`.** It used to answer
  `{ status: 408, msg }` with no `data` key, so `config = (await fetchConfig()).data`
  set `undefined` and the next poll threw on `config.units.engine.ip`. The result is
  now a union. Loop on `!c.ok` (and `isBackendReadableConfig` at boot). Do not put
  a unit-body schema inside `fetchFromUrl`: `fetchConfig` uses that helper too, and
  a config JSON object is not `string | number`.
- **`prefix` is `config.backend.url || process.env.API_PREFIX`.** The prefix the
  process really serves may never have come from the config. Anything that compares
  a new config against "what we are running" has to compare against a value captured
  at listen time, not against `config.backend`.
- **Backend `tsc` skips test files.** `tsconfig.json` excludes `*.test.ts` and
  `__tests__`, so tests do not land in `dist`. A test that needs the schema at
  runtime still must not import it: startup installs `dist` outside the workspace.
- **Lint the backend before you build it in a clone.** eslint picks up
  `apps/backend/dist` once it exists, which produces phantom failures. CI lints
  before it builds, so it never sees them.
- **jest ran every backend test twice on CI, and this file said it did not.** The
  claim above used to cover jest as well. It was wrong: CI's order is install, lint,
  build, grep, tests, so the jest step runs after `dist` exists and `jest --listTests`
  found both copies — 172 cases where `src` alone has 86. `jest.config.json` now sets
  `testPathIgnorePatterns` to `["/node_modules/", "/dist/"]`, and `tsc` no longer
  emits the tests. Review finding on the P4 PR. Check the CI step order before
  writing down that a step never sees a build.

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
- **A backend route that reads `index.ts` needs `jest.doMock("../..")`.** Importing
  `index.ts` for real starts the whole server, `main()` runs on import. Mock it and
  the route's own `fetchConfig`, then mount the router on a bare express app.
- **The panel's vitest run is `--environment jsdom`, so `sessionStorage` is there.**
  A test of it has to `sessionStorage.clear()` between cases; the store is shared
  across the file.
- **A `vi.mock` factory cannot close over a `const` of the test file.** vitest hoists
  the `vi.mock` call above the imports and runs the factory when the mocked module is
  first pulled in, which is before the `const` exists. Build the `vi.fn()` inside the
  factory, import the mocked symbol normally and take it back with `vi.mocked(...)`.
  vitest 0.9.4 has `vi.mocked`; it has no `vi.hoisted`.
