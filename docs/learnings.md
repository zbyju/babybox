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

## Configer

- **`configs/main.json` is gitignored and persists across updates.** Its on-disk
  shape is the interface with every deployed box. Never change the format in a way an
  old file cannot be read.
- **`tsconfig.json` includes all of `src`.** Anything under `src` ends up in `dist`
  and is started by pm2. Exclude test files.
- **The db factory caches the init promise.** `mainConfig()` writes `main.json` on
  boot; two concurrent inits interleave writes. Do not call it directly, use
  `DbFactory.getMainDb()`.

## Process

- **A PR branch checked out in the main checkout cannot be committed to from a
  worktree.** Use a side branch and fast-forward push.
