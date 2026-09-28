#!/usr/bin/env bash
# Boot 1 on an old box, run by the real startup app from the legacy-runtime tag.
# Run from source/ at that tag, with TARGET_SHA set to the commit under test.
# The old app pulls, runs pnpm run build, and starts the apps through HEAD's
# root start scripts, with the old pm2 and no ~/.bun/bin on PATH.
# It never puts dist2 back after a failed start, so a failed start here is a
# box that stays down.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE="$(pwd)"
ROOT="$(cd .. && pwd)"
if [ -z "${TARGET_SHA:-}" ]; then
  echo "TARGET_SHA is not set" >&2
  exit 1
fi
if [ -z "${RUNNER_TEMP:-}" ]; then
  RUNNER_TEMP="$(mktemp -d)"
fi
export GIT_TERMINAL_PROMPT=0
REMOTE="$RUNNER_TEMP/babybox-boot1.git"

fail() {
  echo "$1" >&2
  exit 1
}

is_windows() {
  [ "$(node -p "process.platform")" = "win32" ]
}

pm2_version() {
  pm2 --version | tail -n 1 | tr -d '\r'
}

bun_home() {
  local dir
  dir="$(node -e "const os=require('os');const path=require('path');process.stdout.write(path.join(os.homedir(),'.bun'))")"
  if command -v cygpath >/dev/null 2>&1; then
    dir="$(cygpath -u "$dir")"
  fi
  printf '%s\n' "$dir"
}

show_logs() {
  echo "---- startup.last.json ----" >&2
  cat "$SOURCE/logs/startup.last.json" >&2 || true
  echo "---- startup.log tail ----" >&2
  tail -n 100 "$SOURCE/logs/startup.log" >&2 || true
  pm2 status >&2 || true
  pm2 logs --nostream --lines 40 >&2 || true
}

on_exit() {
  pm2 kill >/dev/null 2>&1 || true
}
trap on_exit EXIT

# The box has no Bun before its first boot on the new code.
remove_bun() {
  rm -rf "$(bun_home)"
}

publish_tip() {
  git push -q -f "$REMOTE" "$1:refs/heads/tip"
  git fetch -q localtip
}

set_up_remote() {
  rm -rf "$REMOTE"
  git init -q --bare "$REMOTE"
  if git remote get-url localtip >/dev/null 2>&1; then
    git remote remove localtip
  fi
  git remote add localtip "$REMOTE"
  git checkout -q -B legacy-box
  publish_tip HEAD
  git branch -q --set-upstream-to=localtip/tip
}

# A reboot stops pm2. The autostart then runs the startup app.
old_startup() {
  pm2 kill >/dev/null 2>&1 || true
  rm -f "$SOURCE/logs/startup.log" "$SOURCE/logs/startup.last.json"
  if is_windows; then
    (cd apps/startup && pnpm run start)
  else
    (cd apps/startup && pnpm run start --ubuntu)
  fi
}

# TARGET_SHA with a panel build that exits 1. The work tree does not change.
broken_commit() {
  local index blob tree
  index="$RUNNER_TEMP/boot1-broken.index"
  rm -f "$index"
  GIT_INDEX_FILE="$index" git -C "$ROOT" read-tree "$TARGET_SHA"
  blob="$(git -C "$ROOT" show "$TARGET_SHA:source/apps/panel/package.json" |
    node -e "let s='';process.stdin.on('data',(d)=>{s+=d;}).on('end',()=>{const p=JSON.parse(s);p.scripts.build='exit 1';process.stdout.write(JSON.stringify(p,null,2)+'\n');});" |
    git -C "$ROOT" hash-object -w --stdin)"
  GIT_INDEX_FILE="$index" git -C "$ROOT" update-index \
    --cacheinfo "100644,${blob},source/apps/panel/package.json"
  tree="$(GIT_INDEX_FILE="$index" git -C "$ROOT" write-tree)"
  GIT_AUTHOR_NAME=ci GIT_AUTHOR_EMAIL=ci@example.com \
    GIT_COMMITTER_NAME=ci GIT_COMMITTER_EMAIL=ci@example.com \
    git -C "$ROOT" commit-tree "$tree" -p "$TARGET_SHA" -m "test: break the panel build"
}

assert_head() {
  local got
  got="$(git rev-parse HEAD)"
  if [ "$got" != "$1" ]; then
    show_logs
    fail "HEAD is ${got}, want $1"
  fi
}

assert_clean() {
  local dirty
  dirty="$(git status --porcelain)"
  if [ -n "$dirty" ]; then
    printf '%s\n' "$dirty" >&2
    fail "working tree is dirty"
  fi
}

assert_record() {
  if ! STEP="$1" OK="$2" RECORD="$SOURCE/logs/startup.last.json" node <<'EOF'
const fs = require("fs");
const record = JSON.parse(fs.readFileSync(process.env.RECORD, "utf8"));
if (record.step !== process.env.STEP || String(record.ok) !== process.env.OK) {
  console.error(JSON.stringify(record));
  process.exit(1);
}
EOF
  then
    show_logs
    fail "startup.last.json is not $1 ok:$2"
  fi
}

marker_of() {
  if [ -f "$ROOT/$1/marker.txt" ]; then
    tr -d '\r' <"$ROOT/$1/marker.txt"
  else
    printf '%s\n' "none"
  fi
}

assert_marker() {
  local got
  got="$(marker_of "$1")"
  if [ "$got" != "$2" ]; then
    show_logs
    fail "$1 marker is '${got}', want '$2'"
  fi
}

wait_http() {
  local i=0
  while [ "$i" -lt 30 ]; do
    if curl -sf "$1" >/dev/null; then
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  echo "no answer from $1" >&2
  return 1
}

assert_apps() {
  if ! wait_http "http://127.0.0.1:5001/api/v1/status"; then
    show_logs
    fail "configer did not answer /status"
  fi
  if ! wait_http "http://127.0.0.1:5000/api/v1/status"; then
    show_logs
    fail "panel did not answer /status"
  fi
}

assert_panel_page() {
  local page
  page="$(curl -sf "http://127.0.0.1:5000/" || true)"
  if ! grep -qi "<html" <<<"$page"; then
    show_logs
    fail "the panel page is not served"
  fi
}

assert_runtime() {
  local i=0
  while [ "$i" -lt 10 ]; do
    if node "$HERE/assert-runtime.js" "$1"; then
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  show_logs
  fail "the apps do not run on $1"
}

LEGACY_SHA="$(git rev-parse "legacy-runtime^{commit}")"
PM2_WANT="$(pm2_version)"
assert_head "$LEGACY_SHA"
set_up_remote

echo "a legacy box starts the legacy tree on Node"
remove_bun
pnpm install --frozen-lockfile
old_startup
assert_head "$LEGACY_SHA"
assert_apps
assert_runtime node
printf '%s\n' "legacy" >"$ROOT/dist/marker.txt"

echo "boot 1 with a failed build starts the legacy dist on Bun"
BROKEN_SHA="$(broken_commit)"
publish_tip "$BROKEN_SHA"
old_startup
assert_head "$BROKEN_SHA"
assert_clean
assert_record "BUILD_PANEL" "false"
assert_marker "dist" "legacy"
assert_apps
assert_runtime bun

echo "boot 1 with a good build starts the new dist on Bun"
pm2 kill >/dev/null 2>&1 || true
git reset -q --hard "$LEGACY_SHA"
remove_bun
publish_tip "$TARGET_SHA"
old_startup
assert_head "$TARGET_SHA"
assert_clean
assert_record "BUILD_CONFIGER" "true"
assert_marker "dist2" "legacy"
assert_marker "dist" "none"
assert_apps
assert_panel_page
assert_runtime bun
if [ "$(pm2_version)" != "$PM2_WANT" ]; then
  fail "pm2 is $(pm2_version), want ${PM2_WANT}"
fi

echo "legacy-boot1 passed"
