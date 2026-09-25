#!/usr/bin/env bash
# Proves the release path on the legacy-image job.
# The runner already finished pnpm run build with empty stderr.
# This script checks bun 1.4.2, a build after an already-current pull,
# and a forced failure at BUILD_PANEL, START_PANEL, and BOOTSTRAP_BUN.
# Each case also checks the runtime pm2 gave the apps: Bun, or Node when
# the BOOTSTRAP_BUN case left no Bun.

set -euo pipefail

SOURCE="$(pwd)"
ROOT="$(cd .. && pwd)"
if [ -z "${RUNNER_TEMP:-}" ]; then
  RUNNER_TEMP="$(mktemp -d)"
fi
export GIT_TERMINAL_PROMPT=0

fail() {
  echo "$1" >&2
  exit 1
}

show_logs() {
  echo "---- startup.last.json ----" >&2
  cat "$SOURCE/logs/startup.last.json" >&2 || true
  echo "---- startup.log tail ----" >&2
  tail -n 100 "$SOURCE/logs/startup.log" >&2 || true
  pm2 status >&2 || true
}

on_exit() {
  git update-index --no-skip-worktree apps/panel/package.json >/dev/null 2>&1 || true
  git update-index --no-skip-worktree apps/backend/package.json >/dev/null 2>&1 || true
  git update-index --no-skip-worktree package.json >/dev/null 2>&1 || true
  git update-index --no-skip-worktree apps/startup/versions.env >/dev/null 2>&1 || true
  git checkout -- apps/panel/package.json apps/backend/package.json package.json apps/startup/versions.env >/dev/null 2>&1 || true
  rm -f apps/panel/fail-panel-build.js apps/backend/omit-dist-entry.js
  pm2 delete configer >/dev/null 2>&1 || true
  pm2 delete babybox >/dev/null 2>&1 || true
}
trap on_exit EXIT

assert_bun() {
  local bin got
  bin="$(node -e "const os=require('os');const path=require('path');const name=process.platform==='win32'?'bun.exe':'bun';process.stdout.write(path.join(os.homedir(),'.bun','bin',name))")"
  if [ ! -f "$bin" ]; then
    fail "bun binary is missing at ${bin}"
  fi
  got="$("$bin" -v | tr -d '\r')"
  if [ "$got" != "1.4.2" ]; then
    fail "bun is ${got}, want 1.4.2"
  fi
}

install_pm2() {
  npm install -g pm2@7.0.4
  local prefix
  prefix="$(npm prefix -g)"
  if command -v cygpath >/dev/null 2>&1; then
    prefix="$(cygpath -u "$prefix")"
  fi
  export PATH="${prefix}:${prefix}/bin:${PATH}"
  pm2 -v >/dev/null
}

hide_local_files() {
  local exclude pattern
  exclude="$ROOT/.git/info/exclude"
  mkdir -p "$ROOT/.git/info"
  touch "$exclude"
  for pattern in \
    "source/apps/panel/fail-panel-build.js" \
    "source/apps/backend/omit-dist-entry.js"
  do
    if ! grep -qxF "$pattern" "$exclude"; then
      printf '%s\n' "$pattern" >>"$exclude"
    fi
  done
}

assert_clean() {
  local dirty
  dirty="$(git status --porcelain)"
  if [ -n "$dirty" ]; then
    printf '%s\n' "$dirty" >&2
    fail "working tree is dirty"
  fi
}

stop_apps() {
  pm2 delete configer >/dev/null 2>&1 || true
  pm2 delete babybox >/dev/null 2>&1 || true
}

seed_previous() {
  stop_apps
  if [ ! -f "$SOURCE/apps/backend/dist/index.js" ]; then
    fail "backend dist is missing"
  fi
  rm -rf "$ROOT/dist" "$ROOT/dist2" "$ROOT/dist-next"
  mkdir -p "$ROOT/dist"
  cp -R "$SOURCE/apps/backend/dist/." "$ROOT/dist/"
  cp "$SOURCE/apps/backend/package.json" "$ROOT/dist/package.json"
  if [ -f "$SOURCE/bun.lock" ]; then
    cp "$SOURCE/bun.lock" "$ROOT/dist/bun.lock"
  fi
  printf '%s\n' "NODE_ENV=development" "PORT=5000" "API_PREFIX=/api/v1" >"$ROOT/dist/.env"
  # The BOOTSTRAP_BUN case deletes ~/.bun, then checks a bad checksum.
  # The previous dist must still start from modules this seed wrote.
  (
    cd "$ROOT/dist"
    "$(node -e "const os=require('os');const path=require('path');const name=process.platform==='win32'?'bun.exe':'bun';process.stdout.write(path.join(os.homedir(),'.bun','bin',name))")" install --no-save
  )
  printf '%s\n' "previous-live" >"$ROOT/dist/marker.txt"
  printf '%s\n' '{"sha":"0000000000000000000000000000000000000000"}' >"$ROOT/dist/release.json"
}

assert_marker() {
  local text
  text="$(tr -d '\r' <"$ROOT/dist/marker.txt")"
  if [ "$text" != "previous-live" ]; then
    fail "live dist marker is '${text}'"
  fi
}

point_at_head() {
  local remote
  remote="$RUNNER_TEMP/babybox-tip.git"
  rm -rf "$remote"
  git init --bare "$remote"
  git push "$remote" HEAD:refs/heads/tip
  if git remote get-url localtip >/dev/null 2>&1; then
    git remote remove localtip
  fi
  git remote add localtip "$remote"
  git fetch localtip
  git branch --set-upstream-to=localtip/tip
}

run_startup() {
  rm -f "$SOURCE/logs/startup.log" "$SOURCE/logs/startup.last.json"
  if [ "$(node -p "process.platform")" = "win32" ]; then
    node apps/startup/src/index.js
  else
    node apps/startup/src/index.js --ubuntu
  fi
}

assert_record() {
  local step="$1"
  local needle="$2"
  if ! STEP="$step" NEEDLE="$needle" RECORD="$SOURCE/logs/startup.last.json" node <<'EOF'
const fs = require("fs");
const record = JSON.parse(fs.readFileSync(process.env.RECORD, "utf8"));
const message = String(record.message);
if (record.step !== process.env.STEP || record.ok !== false) {
  console.error(JSON.stringify(record));
  process.exit(1);
}
const needles = String(process.env.NEEDLE).split("|");
let found = false;
for (let i = 0; i < needles.length; i += 1) {
  if (message.indexOf(needles[i]) !== -1) {
    found = true;
  }
}
if (!found) {
  console.error(JSON.stringify(record));
  process.exit(1);
}
EOF
  then
    show_logs
    fail "startup.last.json is not ${step}"
  fi
}

wait_http() {
  local url="$1"
  local i=0
  while [ "$i" -lt 30 ]; do
    if curl -sf "$url" >/dev/null; then
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  echo "no answer from ${url}" >&2
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

assert_runtime() {
  local i=0
  while [ "$i" -lt 10 ]; do
    if node apps/startup/tests/assert-runtime.js "$1"; then
      return 0
    fi
    i=$((i + 1))
    sleep 2
  done
  show_logs
  fail "the apps do not run on $1"
}

assert_panel_page() {
  local page
  page="$(curl -sf "http://127.0.0.1:5000/" || true)"
  if ! grep -qi "<html" <<<"$page"; then
    show_logs
    fail "the panel page is not served"
  fi
}

skip_worktree() {
  git update-index --skip-worktree "$1"
}

restore_tracked() {
  git update-index --no-skip-worktree "$1"
  git checkout -- "$1"
}

patch_script() {
  local file="$1"
  local key="$2"
  local value="$3"
  FILE="$file" KEY="$key" VALUE="$value" node <<'EOF'
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync(process.env.FILE, "utf8"));
pkg.scripts[process.env.KEY] = process.env.VALUE;
fs.writeFileSync(process.env.FILE, JSON.stringify(pkg, null, 2) + "\n");
EOF
  skip_worktree "$file"
}

break_panel_build() {
  printf '%s\n' "process.stderr.write(\"panel broke\\n\");" "process.exit(1);" \
    >apps/panel/fail-panel-build.js
  patch_script apps/panel/package.json build "node fail-panel-build.js"
}

# Drop the new backend entry after tsc.
# seed_previous already copied the old entry into the live dist.
# start:main stays the real script, so rollback can start that dist.
break_new_dist_entry() {
  cat >apps/backend/omit-dist-entry.js <<'EOF'
const fs = require("fs");
fs.rmSync("dist/index.js");
EOF
  patch_script apps/backend/package.json build "tsc --build && node omit-dist-entry.js"
}

break_bun_sha() {
  node <<'EOF'
const fs = require("fs");
const file = "apps/startup/versions.env";
const zeros = "0".repeat(64);
let text = fs.readFileSync(file, "utf8");
text = text.replace(/^BUN_LINUX_X64_SHA256=.*$/m, "BUN_LINUX_X64_SHA256=" + zeros);
text = text.replace(/^BUN_WINDOWS_X64_SHA256=.*$/m, "BUN_WINDOWS_X64_SHA256=" + zeros);
fs.writeFileSync(file, text);
EOF
  skip_worktree apps/startup/versions.env
}

assert_already_current() {
  if ! node <<'EOF'
const fs = require("fs");
const log = fs.readFileSync(process.env.LOG, "utf8");
const boot = log.indexOf("Krok BOOTSTRAP_BUN");
const current = log.indexOf("Aplikace je aktuální");
const built = log.indexOf("Krok BUILD_PANEL skončil");
if (boot < 0 || current < 0 || built < 0 || boot > current || current > built) {
  console.error("boot", boot, "current", current, "built", built);
  process.exit(1);
}
const release = JSON.parse(fs.readFileSync(process.env.RELEASE, "utf8"));
if (release.sha !== process.env.HEAD) {
  console.error(JSON.stringify(release));
  process.exit(1);
}
EOF
  then
    show_logs
    fail "already-current checkout did not build"
  fi
}

assert_bun
install_pm2
hide_local_files
assert_clean
point_at_head

echo "already current checkout still builds"
seed_previous
HEAD_SHA="$(git rev-parse HEAD)"
LOG="$SOURCE/logs/startup.log" RELEASE="$ROOT/dist/release.json" HEAD="$HEAD_SHA" \
  run_startup
LOG="$SOURCE/logs/startup.log" RELEASE="$ROOT/dist/release.json" HEAD="$HEAD_SHA" \
  assert_already_current
assert_apps
assert_runtime bun
assert_panel_page
stop_apps

echo "forced BUILD_PANEL keeps the previous dist"
seed_previous
break_panel_build
assert_clean
run_startup || true
assert_record "BUILD_PANEL" "panel broke"
assert_marker
assert_apps
assert_runtime bun
restore_tracked apps/panel/package.json
rm -f apps/panel/fail-panel-build.js
stop_apps

echo "forced START_PANEL restores the previous dist"
seed_previous
# The build drops apps/backend/dist/index.js.
# The next case still seeds the previous dist from that file.
cp apps/backend/dist/index.js "$RUNNER_TEMP/backend-index.js"
break_new_dist_entry
assert_clean
run_startup || true
assert_record "START_PANEL" "Script not found|start:main"
assert_marker
assert_apps
assert_runtime bun
restore_tracked apps/backend/package.json
rm -f apps/backend/omit-dist-entry.js
cp "$RUNNER_TEMP/backend-index.js" apps/backend/dist/index.js
stop_apps

echo "forced BOOTSTRAP_BUN keeps the previous dist"
seed_previous
# Bun already matches the pin, so bootstrap does not download.
# Remove it so the bad sha256 is checked.
bun_home="$(node -e "const os=require('os');const path=require('path');process.stdout.write(path.join(os.homedir(),'.bun'))")"
if command -v cygpath >/dev/null 2>&1; then
  bun_home="$(cygpath -u "$bun_home")"
fi
rm -rf "$bun_home"
break_bun_sha
assert_clean
run_startup || true
assert_record "BOOTSTRAP_BUN" "Kontrolní součet"
assert_marker
assert_apps
assert_runtime node
restore_tracked apps/startup/versions.env
stop_apps

assert_clean
echo "legacy-image release path passed"
