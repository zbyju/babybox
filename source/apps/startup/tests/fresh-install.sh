#!/usr/bin/env bash
set -euo pipefail

root="$(pwd)"
startup="$root/source/apps/startup"
export PM2_HOME="$RUNNER_TEMP/babybox-fresh-pm2"
export GIT_TERMINAL_PROMPT=0

# Keep the checkout on a branch that can pull the exact test revision twice.
git branch fresh-install-upstream HEAD
git switch -c fresh-install-test
git branch --set-upstream-to=fresh-install-upstream

if [[ "$RUNNER_OS" == Windows ]]; then
  export APPDATA="$(cygpath -w "$RUNNER_TEMP/babybox-fresh-profile")"
  launcher="$(cygpath -u "$APPDATA")/Microsoft/Windows/Start Menu/Programs/Startup/babybox.cmd"
  install() {
    cmd.exe //d //c "source\apps\startup\scripts\windows\install.bat"
  }
  login() {
    (cd "$(dirname "$launcher")" && cmd.exe //d //c babybox.cmd)
  }
else
  export BABYBOX_DIR="$root"
  export PATH="$HOME/.npm-global/bin:$PATH"
  install() {
    bash "$startup/scripts/ubuntu/install.sh"
  }
  login() {
    bash "$startup/scripts/ubuntu/startup.sh"
  }
fi

cleanup() {
  if [[ "$?" -ne 0 ]]; then
    cat "$root/source/logs/startup.last.json" >&2 || true
    tail -n 120 "$root/source/logs/startup.log" >&2 || true
  fi
  pm2 kill || true
}
trap cleanup EXIT

assert_services() {
  local configer backend page
  for _ in {1..45}; do
    if configer="$(curl -fsS http://127.0.0.1:5001/api/v1/status)" &&
      backend="$(curl -fsS http://127.0.0.1:5000/api/v1/status)" &&
      page="$(curl -fsS http://127.0.0.1:5000/)"; then
      grep -q '1.4.2' <<<"$configer"
      grep -q '1.4.2' <<<"$backend"
      grep -qi '<html' <<<"$page"
      return 0
    fi
    sleep 1
  done
  return 1
}

test ! -e source/node_modules
test ! -e dist
install
assert_services
test -z "$(git status --porcelain)"
pm2 kill
login
assert_services
test -z "$(git status --porcelain)"

if [[ "$RUNNER_OS" == Windows ]]; then
  # Registration uses the same per-user entry on repeated installation.
  install
  assert_services
  entries="$(find "$(dirname "$launcher")" -maxdepth 1 -type f)"
  test "$entries" = "$launcher"
fi
