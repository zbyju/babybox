#!/bin/bash
# Shape checks for scripts/windows/startup.bat.
# The behavioral tests run on Windows.
# Run: bash apps/startup/tests/startup.windows.static.sh
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BAT="$ROOT/scripts/windows/startup.bat"

fail() {
  echo "FAIL: $1"
  exit 1
}

[ -f "$BAT" ] || fail "missing startup.bat"

need() {
  grep -qF -- "$1" "$BAT" || fail "missing: $1"
}

forbid() {
  if grep -qF -- "$1" "$BAT"; then
    fail "forbidden: $1"
  fi
}

need "17763"
need "%USERPROFILE%\.bun\bin"
need "bun.exe"
need "bun-windows-x64.zip"
need "BUN_WINDOWS_X64_SHA256"
need "babybox-bootstrap"
need "node_modules\pino"
need "CPU_HOLD"
need "call curl"
need "call tar"
need "call certutil"
need "call npm install -g pm2@"
need "call pnpm run start"
need "BABYBOX_OS_RELEASE"

forbid "nvm use"
forbid "call nvm"
forbid "call git"
forbid "x64-baseline"
forbid "pnpm@"
forbid "--ubuntu"
forbid "Windows 8"
forbid "winston"

echo "startup.bat shape ok"
