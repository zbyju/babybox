#!/bin/bash
# Tests for scripts/ubuntu/startup.sh.
#
# Run: bash apps/startup/tests/startup.test.sh
#
# Each case gets its own HOME and its own PATH. Nothing is installed
# on the machine that runs the tests.
set -u

SRC_STARTUP="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PASSED=0
FAILED=0
SANDBOX=""

ALL_PROBES="startup/pino backend/express configer/express panel/vue"

pass() { PASSED=$((PASSED + 1)); }
fail() { FAILED=$((FAILED + 1)); echo "  FAIL: $1"; }

expect_called() { grep -qF -- "$1" "$CALLS" && pass || fail "chybi volani: $1"; }
expect_not_called() { grep -qF -- "$1" "$CALLS" && fail "nemelo se volat: $1" || pass; }
expect_log() { grep -qF -- "$1" "$LOG" && pass || fail "chybi v logu: $1"; }
expect_no_log() { grep -qF -- "$1" "$LOG" && fail "nemelo byt v logu: $1" || pass; }
expect_rc() { [ "$RC" = "$1" ] && pass || fail "navratovy kod $RC, cekali jsme $1"; }
expect_no_n() {
  if grep -E '(^|[[:space:]])n[[:space:]]' "$CALLS" >/dev/null; then
    fail "nemelo se volat n"
  else
    pass
  fi
}

hash_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
    return 0
  fi
  sha256sum "$1" | awk '{print $1}'
}

write_stubs() {
  local bin="$1"
  mkdir -p "$bin"

  cat > "$bin/npm" <<'EOF'
#!/bin/bash
echo "npm $*" >> "$CALLS"
if [ "${1:-} ${2:-}" = "config get" ]; then
  echo "$HOME/.npm-global"
  exit 0
fi
if [ "${1:-} ${2:-}" = "install -g" ]; then
  [ "${NPM_INSTALL_EXIT:-0}" = "0" ] || exit 1
  case "${3:-}" in
    pm2@*) printf '%s\n' "${3#pm2@}" > "$STATE/pm2_version" ;;
    *) echo "unexpected $3" >> "$CALLS"; exit 1 ;;
  esac
fi
exit 0
EOF

  cat > "$bin/pm2" <<'EOF'
#!/bin/bash
echo "pm2 $*" >> "$CALLS"
if [ "${1:-}" = "--version" ]; then
  v="$(cat "$STATE/pm2_version" 2>/dev/null || true)"
  [ -n "$v" ] || exit 1
  printf '%s\n' "$v"
  exit 0
fi
if [ "${1:-}" = "update" ]; then
  [ "${PM2_UPDATE_EXIT:-0}" = "0" ] || exit 1
fi
exit 0
EOF

  cat > "$bin/pnpm" <<'EOF'
#!/bin/bash
echo "pnpm $*" >> "$CALLS"
echo "PATH=$PATH" >> "$CALLS"
exit 0
EOF

  cat > "$bin/n" <<'EOF'
#!/bin/bash
echo "n $*" >> "$CALLS"
exit 1
EOF

  chmod +x "$bin/npm" "$bin/pm2" "$bin/pnpm" "$bin/n"
}

write_curl() {
  local bin="$1"
  mkdir -p "$bin"
  cat > "$bin/curl" <<'EOF'
#!/bin/bash
echo "curl $*" >> "$CALLS"
if [ "${CURL_FAIL:-0}" = "1" ]; then
  exit 1
fi
out=""
prev=""
for arg in "$@"; do
  if [ "$prev" = "-o" ]; then
    out="$arg"
  fi
  prev="$arg"
done
if [ -z "$out" ]; then
  echo "curl missing -o" >> "$CALLS"
  exit 1
fi
cp "$BUN_ZIP" "$out"
exit 0
EOF
  chmod +x "$bin/curl"
}

write_bun_stub() {
  local dest="$1"
  local print_version="$2"
  local status="$3"
  mkdir -p "$(dirname "$dest")"
  cat > "$dest" <<EOF
#!/bin/bash
echo "bun \$*" >> "\$CALLS"
if [ "\${1:-}" = "-v" ]; then
  printf '%s\n' "${print_version}"
fi
exit ${status}
EOF
  chmod +x "$dest"
}

make_bun_zip() {
  local zip_path="$1"
  local dir
  dir="$(dirname "$zip_path")/zip-src"
  rm -rf "$dir"
  mkdir -p "$dir/bun-linux-x64"
  cat > "$dir/bun-linux-x64/bun" <<'EOF'
#!/bin/bash
if [ "${1:-}" = "-v" ]; then
  printf '%s\n' "1.4.2"
  exit 0
fi
exit 0
EOF
  chmod +x "$dir/bun-linux-x64/bun"
  rm -f "$zip_path"
  (
    cd "$dir" || exit 1
    zip -q -r "$zip_path" bun-linux-x64
  )
}

reset_case() {
  STUB_PM2="7.0.4"
  STUB_BUN_MISSING=0
  STUB_BUN_PRINT="1.4.2"
  STUB_BUN_EXIT=0
  HOLD_VERSION=""
  NPM_INSTALL_EXIT=0
  PM2_UPDATE_EXIT=0
  CURL_FAIL=0
  DROP_KEY=""
  REWRITE_SHA=0
  SEED_DEPS="$ALL_PROBES"
}

run_case() {
  local sandbox home startup_dir probe sha
  if [ -n "$SANDBOX" ] && [ -d "$SANDBOX" ]; then
    rm -rf "$SANDBOX"
  fi
  sandbox="$(mktemp -d)"
  SANDBOX="$sandbox"
  home="$sandbox/home"
  startup_dir="$home/babybox/source/apps/startup"

  STATE="$sandbox/state"
  CALLS="$sandbox/calls"
  LOG="$home/babybox/source/logs/startup.sh.log"
  BUN_ZIP="$sandbox/bun-linux-x64.zip"
  mkdir -p "$STATE" "$startup_dir/scripts/ubuntu" "$home/bin" "$home/.npm-global/bin"
  : > "$CALLS"

  if [ -n "$DROP_KEY" ]; then
    grep -v "^${DROP_KEY}=" "$SRC_STARTUP/versions.env" > "$startup_dir/versions.env"
  else
    cp "$SRC_STARTUP/versions.env" "$startup_dir/versions.env"
  fi
  cp "$SRC_STARTUP/scripts/ubuntu/startup.sh" "$startup_dir/scripts/ubuntu/startup.sh"
  make_bun_zip "$BUN_ZIP"
  if [ "$REWRITE_SHA" = "1" ]; then
    sha="$(hash_file "$BUN_ZIP")"
    awk -v sha="$sha" '
      BEGIN { FS = OFS = "=" }
      $1 == "BUN_LINUX_X64_SHA256" { $2 = sha }
      { print }
    ' "$startup_dir/versions.env" > "$startup_dir/versions.env.tmp"
    mv "$startup_dir/versions.env.tmp" "$startup_dir/versions.env"
  fi

  write_stubs "$home/.npm-global/bin"
  write_curl "$home/bin"
  if [ "$STUB_BUN_MISSING" != "1" ]; then
    write_bun_stub "$home/.bun/bin/bun" "$STUB_BUN_PRINT" "$STUB_BUN_EXIT"
  fi
  if [ -n "$HOLD_VERSION" ]; then
    mkdir -p "$home/.bun"
    printf '%s\n' "$HOLD_VERSION" > "$home/.bun/cpu-hold"
  fi
  printf '%s\n' "$STUB_PM2" > "$STATE/pm2_version"

  for probe in $SEED_DEPS; do
    mkdir -p "$home/babybox/source/apps/${probe%%/*}/node_modules/${probe#*/}"
  done

  env -i \
    HOME="$home" \
    PATH="$home/bin:/usr/bin:/bin" \
    TMPDIR="$sandbox" \
    STATE="$STATE" \
    CALLS="$CALLS" \
    BUN_ZIP="$BUN_ZIP" \
    NPM_INSTALL_EXIT="$NPM_INSTALL_EXIT" \
    PM2_UPDATE_EXIT="$PM2_UPDATE_EXIT" \
    CURL_FAIL="$CURL_FAIL" \
    bash "$startup_dir/scripts/ubuntu/startup.sh" >"$sandbox/stdout" 2>&1 &
  local pid=$!
  (
    sleep "${RUN_TIMEOUT:-20}"
    kill -9 "$pid" 2>/dev/null
  ) >/dev/null 2>&1 &
  local watchdog=$!
  wait "$pid"
  RC=$?
  kill "$watchdog" 2>/dev/null || true
  wait "$watchdog" 2>/dev/null || true
  if [ "$RC" -eq 137 ]; then
    echo "  (skript byl zabit po ${RUN_TIMEOUT:-20}s)"
  fi
  return 0
}

echo "verze sedi -> bun se nestahuje a pm2 se neinstaluje"
reset_case
run_case
expect_not_called "curl "
expect_not_called "npm install -g"
expect_no_n
expect_called "pnpm run start --ubuntu"
expect_called "$SANDBOX/home/.bun/bin"
expect_no_log "Zavislosti chybi"
expect_rc 0

echo "bun chybi a soucet sedi -> zip skonci v \$HOME/.bun/bin"
reset_case
STUB_BUN_MISSING=1
REWRITE_SHA=1
run_case
expect_called "https://github.com/oven-sh/bun/releases/download/bun-v1.4.2/bun-linux-x64.zip"
expect_not_called "baseline"
expect_no_n
expect_not_called "pnpm@"
expect_log "Bun 1.4.2 je nainstalovany"
expect_called "pnpm run start --ubuntu"
if [ "$("$SANDBOX/home/.bun/bin/bun" -v 2>/dev/null)" = "1.4.2" ]; then
  pass
else
  fail "bun v home nehlasi 1.4.2"
fi
expect_rc 0

echo "bun ma prefix v -> nestahuje se"
reset_case
STUB_BUN_PRINT="v1.4.2"
run_case
expect_not_called "curl "
expect_rc 0

echo "soucet nesedi -> stary bun zustane a panel nabehne"
reset_case
STUB_BUN_PRINT="0.0.1"
run_case
expect_called "curl "
expect_log "Kontrolni soucet archivu Bun se neshoduje"
expect_called "pnpm run start --ubuntu"
if [ "$("$SANDBOX/home/.bun/bin/bun" -v 2>/dev/null)" = "0.0.1" ]; then
  pass
else
  fail "neshodny soucet prepsal bun"
fi
expect_rc 0

echo "stazeni selze -> panel nabehne"
reset_case
STUB_BUN_MISSING=1
CURL_FAIL=1
run_case
expect_log "Stazeni Bun se nezdarilo"
expect_called "pnpm run start --ubuntu"
expect_rc 0

echo "cpu-hold pro stejnou verzi -> zadne stazeni"
reset_case
STUB_BUN_MISSING=1
HOLD_VERSION="1.4.2"
run_case
expect_not_called "curl "
expect_log "CPU_HOLD"
expect_called "pnpm run start --ubuntu"
expect_rc 0

echo "illegal instruction a stejny hold -> zadne stazeni"
reset_case
STUB_BUN_EXIT=132
HOLD_VERSION="1.4.2"
run_case
expect_not_called "curl "
expect_log "CPU_HOLD"
expect_rc 0

echo "illegal instruction a jina verze v holdu -> stazeni"
reset_case
STUB_BUN_EXIT=132
HOLD_VERSION="1.0.0"
CURL_FAIL=1
run_case
expect_called "curl "
expect_log "Stazeni Bun se nezdarilo"
expect_rc 0

echo "shoda bun smaze cpu-hold"
reset_case
HOLD_VERSION="1.0.0"
run_case
if [ ! -f "$SANDBOX/home/.bun/cpu-hold" ]; then
  pass
else
  fail "cpu-hold zustal po shode verze"
fi

echo "pm2 nesedi -> instaluje se presna verze"
reset_case
STUB_PM2="5.2.0"
run_case
expect_called "npm install -g pm2@7.0.4"
expect_called "pm2 update"
expect_not_called "pnpm@"
expect_not_called "npm install -g n"
expect_rc 0

echo "instalace pm2 selze -> panel nabehne"
reset_case
STUB_PM2="5.2.0"
NPM_INSTALL_EXIT=1
run_case
expect_log "pm2 se nepodarilo nainstalovat"
expect_called "pnpm run start --ubuntu"
expect_rc 0

echo "pm2 update selze -> panel nabehne"
reset_case
STUB_PM2="5.2.0"
PM2_UPDATE_EXIT=1
run_case
expect_log "pm2 update selhal"
expect_called "pnpm run start --ubuntu"
expect_rc 0

echo "versions.env bez PM2_VERSION -> zadne pm2@ a panel nabehne"
reset_case
DROP_KEY="PM2_VERSION"
STUB_PM2="5.2.0"
run_case
expect_log "PM2_VERSION chybi ve versions.env"
expect_log "kontrolu verzi preskakuji"
expect_not_called "npm install -g"
expect_not_called "curl "
expect_called "pnpm run start --ubuntu"
expect_rc 0

echo "chybi pino -> log, winston nestaci, panel nabehne"
reset_case
SEED_DEPS="startup/winston backend/express configer/express panel/vue"
run_case
expect_log "Zavislosti chybi"
expect_called "pnpm run start --ubuntu"
expect_rc 0

echo "git pull se nespousti"
reset_case
run_case
expect_not_called "git "

echo "install-all.sh vola ensure_bun a neinstaluje pnpm 12"
if grep -q 'ensure_bun' "$SRC_STARTUP/scripts/ubuntu/install-all.sh" \
  && grep -q 'startup.sh' "$SRC_STARTUP/scripts/ubuntu/install-all.sh" \
  && ! grep -q 'pnpm@12' "$SRC_STARTUP/scripts/ubuntu/install-all.sh" \
  && ! grep -q 'x64-baseline' "$SRC_STARTUP/scripts/ubuntu/install-all.sh"
then
  pass
else
  fail "install-all.sh nema pin Bun"
fi

echo "startup.sh sonda je pino"
if grep -q 'startup:pino' "$SRC_STARTUP/scripts/ubuntu/startup.sh" \
  && ! grep -q 'winston' "$SRC_STARTUP/scripts/ubuntu/startup.sh"
then
  pass
else
  fail "startup.sh nema sondu pino"
fi

echo "oba skripty jsou platny bash"
if bash -n "$SRC_STARTUP/scripts/ubuntu/startup.sh" \
  && bash -n "$SRC_STARTUP/scripts/ubuntu/install-all.sh"
then
  pass
else
  fail "bash -n"
fi

echo "sourcing startup.sh nespusti panel"
source_sandbox="$(mktemp -d)"
if env -i HOME="$source_sandbox/home" PATH="/usr/bin:/bin" bash -c '
  set -euo pipefail
  . "$1"
  echo sourced
' bash "$SRC_STARTUP/scripts/ubuntu/startup.sh" >"$source_sandbox/out" 2>"$source_sandbox/err"
then
  if grep -q '^sourced$' "$source_sandbox/out" && ! grep -q 'pnpm' "$source_sandbox/out"; then
    pass
  else
    fail "source spustil panel"
    cat "$source_sandbox/out" "$source_sandbox/err"
  fi
else
  fail "source skoncil chybou"
  cat "$source_sandbox/out" "$source_sandbox/err"
fi
rm -rf "$source_sandbox"

if [ -n "$SANDBOX" ] && [ -d "$SANDBOX" ]; then
  rm -rf "$SANDBOX"
fi

echo ""
echo "prosly: $PASSED, selhaly: $FAILED"
[ "$FAILED" -eq 0 ]
