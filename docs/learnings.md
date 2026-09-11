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
  undici). Resolution works on CI's Node 18.12.1. On a newer machine, seed the metadata
  cache under `~/Library/Caches/pnpm/metadata` or install from a machine with Node 18.

## Configer

- **`configs/main.json` is gitignored and persists across updates.** Its on-disk
  shape is the interface with every deployed box. Never change the format in a way an
  old file cannot be read.
- **`tsconfig.json` includes all of `src`.** Anything under `src` ends up in `dist`
  and is started by pm2. Exclude test files.
- **The db factory caches the init promise.** `mainConfig()` writes `main.json` on
  boot; two concurrent inits interleave writes. Do not call it directly, use
  `DbFactory.getMainDb()`.
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

## Process

- **A PR branch checked out in the main checkout cannot be committed to from a
  worktree.** Use a side branch and fast-forward push.
