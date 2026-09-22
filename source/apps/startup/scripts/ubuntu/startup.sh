#!/bin/bash
# Starts the panel after login on Ubuntu.
#
# The desktop autostart entry runs this file. Do not move the file.
# Do not rename the file.
#
# This file does not run git pull. The Node startup app pulls, then builds.
# A pull here makes that app see "Already up to date" and skip the build.
#
# Bun is written to $HOME/.bun/bin. This file does not call n.
# This file does not install pnpm.
# A failed Bun or pm2 install does not stop the panel.

BABYBOX_DIR="${BABYBOX_DIR:-$HOME/babybox}"
STARTUP_DIR="$BABYBOX_DIR/source/apps/startup"
LOG_FILE="$BABYBOX_DIR/source/logs/startup.sh.log"

export PATH="$HOME/.bun/bin:$HOME/.npm-global/bin:/usr/local/bin:${PATH:-/usr/bin:/bin}"

log() {
  mkdir -p "$(dirname "$LOG_FILE")"
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

run() {
  mkdir -p "$(dirname "$LOG_FILE")"
  "$@" >>"$LOG_FILE" 2>&1
}

version_matches() {
  [ "$1" = "$2" ] || [ "$1" = "v$2" ]
}

file_sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
    return 0
  fi
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
    return 0
  fi
  return 1
}

lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

read_hold() {
  if [ ! -f "$1" ]; then
    printf ''
    return 0
  fi
  tr -d '[:space:]' < "$1"
}

write_hold() {
  mkdir -p "$(dirname "$1")"
  printf '%s\n' "$2" > "$1"
}

# Sets PROBE_STATUS and PROBE_OUT. 132 means an illegal instruction.
probe_bun() {
  PROBE_STATUS=0
  PROBE_OUT=""
  if [ ! -f "$1" ]; then
    PROBE_STATUS=127
    return 0
  fi
  PROBE_OUT="$("$1" -v 2>/dev/null)" || PROBE_STATUS=$?
}

hold_matches() {
  local recorded
  recorded="$(read_hold "$1")"
  [ -n "$recorded" ] && [ "$recorded" = "$BUN_VERSION" ]
}

cpu_hold() {
  write_hold "$1" "$BUN_VERSION"
  log "Procesor nespusti Bun. Krok CPU_HOLD."
  return 1
}

require_versions() {
  if [ -z "${BUN_VERSION:-}" ]; then
    log "BUN_VERSION chybi ve versions.env"
    return 1
  fi
  if [ -z "${BUN_LINUX_X64_SHA256:-}" ]; then
    log "BUN_LINUX_X64_SHA256 chybi ve versions.env"
    return 1
  fi
  if [ -z "${PM2_VERSION:-}" ]; then
    log "PM2_VERSION chybi ve versions.env"
    return 1
  fi
}

ensure_npm_prefix() {
  local want="$HOME/.npm-global"
  if [ "$(npm config get prefix 2>/dev/null || true)" = "$want" ]; then
    return 0
  fi
  mkdir -p "$want"
  if ! run npm config set prefix "$want"; then
    log "npm prefix se nepodarilo nastavit"
    return 1
  fi
}

# The pinned linux x64 zip only. The baseline zip is the same binary.
ensure_bun() {
  local bin_dir="$HOME/.bun/bin"
  local exe="$bin_dir/bun"
  local hold="$HOME/.bun/cpu-hold"
  local stage=""
  local zip=""
  local url=""
  local actual=""
  local found=""
  local want=""

  mkdir -p "$bin_dir"
  probe_bun "$exe"
  if [ "$PROBE_STATUS" -eq 0 ] && version_matches "$PROBE_OUT" "$BUN_VERSION"; then
    rm -f "$hold"
    return 0
  fi
  if [ "$PROBE_STATUS" -eq 132 ]; then
    if [ ! -f "$hold" ] || hold_matches "$hold"; then
      cpu_hold "$hold" || true
      return 1
    fi
  fi
  if [ "$PROBE_STATUS" -eq 127 ] && hold_matches "$hold"; then
    cpu_hold "$hold" || true
    return 1
  fi

  log "Stahuji Bun $BUN_VERSION"
  stage="$(mktemp -d "${TMPDIR:-/tmp}/babybox-bun.XXXXXX")" || {
    log "Stazeni Bun se nezdarilo"
    return 1
  }
  zip="$stage/bun-linux-x64.zip"
  url="https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-x64.zip"
  if ! curl -fsSL --retry 3 --retry-delay 2 -A babybox-bootstrap -o "$zip" "$url"; then
    log "Stazeni Bun se nezdarilo"
    rm -rf "$stage"
    return 1
  fi
  if ! actual="$(file_sha256 "$zip")"; then
    log "Kontrolni soucet archivu Bun se neshoduje"
    rm -rf "$stage"
    return 1
  fi
  want="$(lower "$BUN_LINUX_X64_SHA256")"
  if [ "$(lower "$actual")" != "$want" ]; then
    log "Kontrolni soucet archivu Bun se neshoduje"
    rm -rf "$stage"
    return 1
  fi
  mkdir -p "$stage/extract"
  if ! unzip -o -q -d "$stage/extract" "$zip"; then
    log "Rozbaleni Bun se nezdarilo"
    rm -rf "$stage"
    return 1
  fi
  found="$stage/extract/bun-linux-x64/bun"
  if [ ! -f "$found" ]; then
    found="$stage/extract/bun"
  fi
  if [ ! -f "$found" ]; then
    log "Rozbaleni Bun se nezdarilo. V archivu chybi bun."
    rm -rf "$stage"
    return 1
  fi
  if ! cp "$found" "$exe"; then
    log "Rozbaleni Bun se nezdarilo"
    rm -rf "$stage"
    return 1
  fi
  chmod 755 "$exe"
  rm -rf "$stage"

  probe_bun "$exe"
  if [ "$PROBE_STATUS" -eq 132 ]; then
    cpu_hold "$hold" || true
    return 1
  fi
  if [ "$PROBE_STATUS" -eq 0 ] && version_matches "$PROBE_OUT" "$BUN_VERSION"; then
    rm -f "$hold"
    log "Bun $BUN_VERSION je nainstalovany"
    return 0
  fi
  log "Bun je ${PROBE_OUT:-chybi}, chceme $BUN_VERSION"
  return 1
}

ensure_pm2() {
  if [ "$(pm2 --version 2>/dev/null || true)" = "$PM2_VERSION" ]; then
    return 0
  fi
  log "Instaluji pm2 $PM2_VERSION"
  if ! run npm install -g "pm2@$PM2_VERSION"; then
    log "pm2 se nepodarilo nainstalovat"
    return 1
  fi
  hash -r
  if ! run pm2 update; then
    log "pm2 update selhal"
  fi
}

# The startup app loads pino.
deps_ok() {
  local probe app pkg
  for probe in startup:pino backend:express configer:express panel:vue; do
    app="${probe%%:*}"
    pkg="${probe#*:}"
    if [ ! -d "$BABYBOX_DIR/source/apps/$app/node_modules/$pkg" ]; then
      return 1
    fi
  done
}

main() {
  log "Start"
  if [ -f "$STARTUP_DIR/versions.env" ]; then
    # shellcheck disable=SC1090,SC1091
    . "$STARTUP_DIR/versions.env"
    if require_versions; then
      ensure_bun || true
      ensure_npm_prefix || true
      ensure_pm2 || true
    else
      log "versions.env je neuplny — kontrolu verzi preskakuji"
    fi
  else
    log "versions.env chybi — kontrolu verzi preskakuji"
  fi

  if ! deps_ok; then
    log "Zavislosti chybi — panel presto spoustim"
  fi

  cd "$STARTUP_DIR" || {
    log "Adresar $STARTUP_DIR neexistuje — koncim"
    exit 1
  }
  pnpm run start --ubuntu
}

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  main "$@"
fi
