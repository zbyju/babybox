# Learnings

Things that cost us time once. Read before you touch the repo. Add one line per
lesson: what happened, what to do instead.

## Tooling

- **Never run the machine's pnpm here.** It rewrites the lockfile format. Use
  `npx pnpm@7.5.0`. CI and every babybox install with `--frozen-lockfile` from that
  version; a lockfile in another format means the box does not start.
- **A green build proves little for the panel.** `pnpm typecheck` on the panel is red
  with 20 pre-existing errors and the build's type gate checks zero files. The docs
  said 17 until P3 counted them on `origin/main` at 1927135. Record your own baseline
  before you start; the bar is no new errors, not a green run.
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
- **`BaseInput` and `BaseSelect` styles are global, not scoped.** They apply from the
  moment the component is imported anywhere in the chunk. A new page that wants the
  settings buttons has to bring its own rules: `SettingsFormActions.vue` defines them
  and a page that does not import it does not get them.

## Tests

- **`fetch` on Node 18 refuses a request that sets `connection`.** undici calls it an
  invalid connection header and the call fails with `TypeError: fetch failed`; Node 24
  forwards the header, so a test written on Node 24 only goes red on CI. Let the agent
  manage the connection and close the server with `closeAllConnections()`.
