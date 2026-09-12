# Learnings

Things that cost us time once. Read before you touch the repo. Add one line per
lesson: what happened, what to do instead.

## Tooling

- **Never run the machine's pnpm here.** It rewrites the lockfile format. Use
  `npx pnpm@7.5.0`. CI and every babybox install with `--frozen-lockfile` from that
  version; a lockfile in another format means the box does not start.
- **A green build proves little for the panel.** `pnpm typecheck` on the panel is red
  with 17 pre-existing errors and the build's type gate checks zero files.
- **The startup app treats any stderr from `pnpm run build` as a failed build.**
  A warning printed by `tsc` or a package script fails the update on the box.
- **Backend `tsc` picks up `bun-types` from a parent `node_modules`.** Pass
  `--typeRoots ./node_modules/@types` when you get TS1005/TS1139 noise.
- **pnpm 7.5.0 cannot reach the registry on Node 20+** (`ERR_INVALID_THIS` from
  undici). Run it under Node 18 through npx instead:
  `npx -y -p node@18.12.1 -p pnpm@7.5.0 pnpm install` from `source/`. npx puts a
  Node 18 binary first on PATH and pnpm's shebang picks it up. Checked 2026-09-12.
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
- **A `tsc` build in a parent folder's shadow needs `"types": []`.** Cheaper and more
  correct than `--typeRoots` on the command line when the package needs no ambient
  types at all.

## Tests

- **`fetch` on Node 18 refuses a request that sets `connection`.** undici calls it an
  invalid connection header and the call fails with `TypeError: fetch failed`; Node 24
  ignores the header, so a test written on Node 24 only goes red on CI. Let the agent
  manage the connection and close the server with `closeAllConnections()`.
