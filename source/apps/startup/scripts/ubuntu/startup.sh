#!/bin/bash
# =============================================================================
# Babybox — spusteni panelu po prihlaseni (Ubuntu)
#
# Autostart (~/.config/autostart/babybox.desktop) odkazuje primo na tento
# soubor. Nesmi se presunout ani prejmenovat, jinak se panel nespusti.
#
# Skript nejdriv srovna verze nastroju podle versions.env a pak spusti panel.
# Zadny krok nesmi spusteni zastavit — kdyz instalace selze (treba neni sit),
# pokracujeme s tim, co uz na pocitaci je. Proto tu neni "set -e".
# =============================================================================

BABYBOX_DIR="$HOME/babybox"
STARTUP_DIR="$BABYBOX_DIR/source/apps/startup"
LOG_FILE="$BABYBOX_DIR/source/logs/startup.sh.log"

# Globalni npm balicky maji vlastni adresar v home, aby nebylo potreba sudo
export PATH="$HOME/.npm-global/bin:/usr/local/bin:$PATH"

mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

run() {
  "$@" >>"$LOG_FILE" 2>&1
}

# ----- Kontrola verzi --------------------------------------------------------

# Prazdna hodnota by se poslala do npm jako "pnpm@", coz npm cte jako latest.
# Radeji nesrovnavame nic, nez abychom nainstalovali neco nepinnuteho.
require_versions() {
  local v
  for v in NODE_VERSION PNPM_VERSION PM2_VERSION N_VERSION; do
    [ -n "${!v}" ] || { log "$v chybi ve versions.env"; return 1; }
  done
}

ensure_npm_prefix() {
  local want="$HOME/.npm-global"
  [ "$(npm config get prefix 2>/dev/null)" = "$want" ] && return 0
  mkdir -p "$want"
  run npm config set prefix "$want" || log "npm prefix se nepodarilo nastavit"
}

ensure_n() {
  [ "$(n --version 2>/dev/null)" = "$N_VERSION" ] && return 0
  log "Instaluji n $N_VERSION"
  run npm install -g "n@$N_VERSION" || { log "n se nepodarilo nainstalovat"; return 1; }
}

# Kdyz se Node nesrovna, pise se NODE_MISMATCH — podle toho se v logu fleetu
# najdou pocitace, ktere bezi na jine verzi, nez versions.env predepisuje.
ensure_node() {
  local want="v$NODE_VERSION"
  local have
  have="$(node -v 2>/dev/null)"
  [ "$have" = "$want" ] && return 0

  log "Node je $have, chceme $want"
  # Kdyz se pinnuta verze 'n' nenainstaluje, zkusime to se starou. Je to porad
  # lepsi nez Node vubec nesrovnat.
  ensure_n
  command -v n >/dev/null 2>&1 || { log "NODE_MISMATCH - Node $have misto $want, n neni k dispozici"; return 1; }

  run n "$NODE_VERSION" || { log "NODE_MISMATCH - Node $have misto $want, n $NODE_VERSION selhalo"; return 1; }
  hash -r

  have="$(node -v 2>/dev/null)"
  [ "$have" = "$want" ] || { log "NODE_MISMATCH - Node je porad $have misto $want"; return 1; }
  log "Node $want nainstalovan"
}

ensure_pnpm() {
  [ "$(pnpm --version 2>/dev/null)" = "$PNPM_VERSION" ] && return 0
  log "Instaluji pnpm $PNPM_VERSION"
  run npm install -g "pnpm@$PNPM_VERSION" || { log "pnpm se nepodarilo nainstalovat"; return 1; }
}

ensure_pm2() {
  [ "$(pm2 --version 2>/dev/null)" = "$PM2_VERSION" ] && return 0
  log "Instaluji pm2 $PM2_VERSION"
  run npm install -g "pm2@$PM2_VERSION" || { log "pm2 se nepodarilo nainstalovat"; return 1; }
  # Bezici demon zustane na stare verzi, dokud ho pm2 update nerestartuje
  run pm2 update || log "pm2 update selhal"
}

# ----- Zavislosti ------------------------------------------------------------

# Kazda aplikace ma vlastni node_modules, tak se ptame na jeden balicek z kazde.
# Kdyby se koukalo jen na startup, rozbity backend by prosel jako v poradku.
deps_ok() {
  local probe app pkg
  for probe in startup:winston backend:express configer:express panel:vue; do
    app="${probe%%:*}"
    pkg="${probe#*:}"
    [ -d "$BABYBOX_DIR/source/apps/$app/node_modules/$pkg" ] || return 1
  done
}

install_deps() {
  run pnpm install --frozen-lockfile && return 0
  log "pnpm install selhal"

  # Kdyz zavislosti porad funguji, nechame je byt. Smazat je a spolehnout se na
  # novou instalaci by pri vypadku site nechalo pocitac uplne bez node_modules.
  if deps_ok; then
    log "Pokracuji se stavajicimi node_modules"
    return 0
  fi

  log "Zavislosti nefunguji — zkousim cistou instalaci"
  rm -rf "$BABYBOX_DIR/source/node_modules" "$BABYBOX_DIR"/source/apps/*/node_modules
  run pnpm install --frozen-lockfile || { log "pnpm install selhal i po vycisteni"; return 1; }
}

# ----- Beh -------------------------------------------------------------------

log "Start"

if [ -f "$STARTUP_DIR/versions.env" ]; then
  # shellcheck source=../../versions.env
  . "$STARTUP_DIR/versions.env"
  if require_versions; then
    ensure_npm_prefix
    ensure_node
    ensure_pnpm
    ensure_pm2
  else
    log "versions.env je neuplny — kontrolu verzi preskakuji"
  fi
else
  log "versions.env chybi — kontrolu verzi preskakuji"
fi

cd "$STARTUP_DIR" || { log "Adresar $STARTUP_DIR neexistuje — koncim"; exit 1; }

install_deps
node src/index.js --ubuntu
