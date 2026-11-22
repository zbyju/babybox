#!/usr/bin/env bash
# Run in a disposable checkout from source/, with Node 18.12.1.
set -euo pipefail

root="$(cd .. && pwd)"
sandbox="$(mktemp -d)"
export PM2_HOME="$sandbox/pm2"
export APPDATA="$sandbox/appdata"
export npm_config_prefix="$sandbox/npm"
export BABYBOX_DIR="$root"
export RESTART_ENABLED=false

windows=false
if [ "$(node -p 'process.platform')" = win32 ]; then
  windows=true
  export APPDATA="$(cygpath -w "$APPDATA")"
  export PM2_HOME="$(cygpath -w "$PM2_HOME")"
  export npm_config_prefix="$(cygpath -w "$npm_config_prefix")"
  export PATH="$sandbox/npm:$PATH"
else
  export PATH="$sandbox/npm/bin:$PATH"
fi

on_exit() {
  if [ "$1" -ne 0 ]; then
    tail -n 100 logs/startup.log || true
    if command -v pm2 >/dev/null; then pm2 logs --nostream --lines 25 || true; fi
  fi
  if command -v pm2 >/dev/null; then pm2 kill >/dev/null 2>&1 || true; fi
}
trap 'on_exit $?' EXIT

run_batch() {
  local script
  script="$(cygpath -w "$1")"
  MSYS2_ARG_CONV_EXCL='*' cmd.exe /d /c "call \"$script\""
}

test ! -d node_modules
test ! -d apps/startup/node_modules
test ! -d apps/configer/dist
test ! -d "$root/dist"
test "$(node -v)" = v18.12.1
echo "Fresh checkout $(git rev-parse HEAD) on $(node -p 'process.platform')"
if "$windows"; then
  run_batch apps/startup/scripts/windows/install.bat
else
  bash apps/startup/scripts/ubuntu/install.sh
fi

config_api=http://127.0.0.1:5001/api/v1
panel_api=http://127.0.0.1:5000/api/v1
wait_http() {
  for ((i=0; i<30; i++)); do
    if curl --max-time 2 -fs "$1"; then return 0; fi
    sleep 1
  done
  echo "No response from $1" >&2
  return 1
}
check_services() {
  wait_http "$config_api/status" >"$sandbox/configer-status.json"
  wait_http "$panel_api/status" >"$sandbox/backend-status.json"
  wait_http http://127.0.0.1:5000/ >"$sandbox/panel.html"
  grep -qi '<!doctype html\|<html' "$sandbox/panel.html"
}

check_services
curl -fsS -X PATCH -H 'Content-Type: application/json' \
  --data '{"babybox":{"name":"Fresh install fixture"}}' "$config_api/config/main" \
  >"$sandbox/saved.json"
cp apps/configer/configs/main.json "$sandbox/first-main.json"

launch_login() {
  pm2 kill
  if "$windows"; then
    launcher="$sandbox/appdata/Microsoft/Windows/Start Menu/Programs/Startup/Babybox.bat"
    test -f "$launcher"
    run_batch "$launcher"
  else
    bash apps/startup/scripts/ubuntu/startup.sh
  fi
  check_services
}

launch_login
curl -fsS "$config_api/config/main" >"$sandbox/second-main.json"
cmp apps/configer/configs/main.json "$sandbox/first-main.json"
grep -q 'Fresh install fixture' "$sandbox/second-main.json"

# A recoverable old document should boot from the backup binding and remain intact.
cp "$sandbox/first-main.json" apps/configer/configs/main.json.bak
node - <<'EOF'
const fs = require("node:fs");
const file = "apps/configer/configs/main.json";
const data = JSON.parse(fs.readFileSync(file, "utf8"));
data.configer = null;
data.legacyFixture = { value: "preserved" };
fs.writeFileSync(file, JSON.stringify(data));
EOF
cp apps/configer/configs/main.json "$sandbox/legacy-main.json"
launch_login
curl -fsS "$config_api/config/main" >"$sandbox/recovered-main.json"
grep -q '"legacyFixture":{"value":"preserved"}' "$sandbox/recovered-main.json"
cmp apps/configer/configs/main.json "$sandbox/legacy-main.json"
cmp apps/configer/configs/main.json.bak "$sandbox/first-main.json"
echo 'Fresh install, second launch, saved config and legacy binding recovery passed.'
