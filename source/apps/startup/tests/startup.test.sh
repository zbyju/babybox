#!/bin/bash
# =============================================================================
# Testy pro scripts/ubuntu/startup.sh
#
# Spusteni:  bash apps/startup/tests/startup.test.sh   (nebo pnpm -F startup test)
#
# Kazdy pripad dostane vlastni HOME s cerstvym stromem babybox a vlastni PATH
# s falesnymi binarkami node, npm, n, pnpm a pm2. Na pocitaci, kde testy bezi,
# se nic neinstaluje ani nemaze.
#
# Stuby si "nainstalovanou verzi" ctou ze souboru ve $STATE a instalace do nej
# zapisuje. Diky tomu jde overit i prechod: pred instalaci jedna verze, po ni
# druha.
# =============================================================================
set -u

SRC_STARTUP="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PASSED=0
FAILED=0

# ----- Falesne binarky -------------------------------------------------------

# Lezi v ~/.npm-global/bin, protoze startup.sh dava tuhle slozku na zacatek
# PATH — jinak by vyhral opravdovy node z /usr/local/bin.
write_stubs() {
  local bin="$1"
  mkdir -p "$bin"

  cat > "$bin/node" <<'EOF'
#!/bin/bash
echo "node $*" >> "$CALLS"
if [ "${1:-}" = "-v" ]; then
  v="$(cat "$STATE/node_version" 2>/dev/null)"
  [ -n "$v" ] || exit 1
  echo "$v"
fi
exit 0
EOF

  cat > "$bin/n" <<'EOF'
#!/bin/bash
echo "n $*" >> "$CALLS"
if [ "${1:-}" = "--version" ]; then
  v="$(cat "$STATE/n_version" 2>/dev/null)"
  [ -n "$v" ] || exit 1
  echo "$v"
  exit 0
fi
[ "${N_EXIT:-0}" = "0" ] || exit 1
echo "v$1" > "$STATE/node_version"
EOF

  cat > "$bin/npm" <<'EOF'
#!/bin/bash
echo "npm $*" >> "$CALLS"
if [ "${1:-} ${2:-}" = "config get" ]; then
  echo "$HOME/.npm-global"
  exit 0
fi
if [ "${1:-} ${2:-}" = "install -g" ]; then
  [ "${NPM_INSTALL_EXIT:-0}" = "0" ] || exit 1
  case "$3" in
    n@*)    echo "${3#n@}"    > "$STATE/n_version" ;;
    pnpm@*) echo "${3#pnpm@}" > "$STATE/pnpm_version" ;;
    pm2@*)  echo "${3#pm2@}"  > "$STATE/pm2_version" ;;
  esac
fi
exit 0
EOF

  cat > "$bin/pnpm" <<'EOF'
#!/bin/bash
echo "pnpm $*" >> "$CALLS"
if [ "${1:-}" = "--version" ]; then
  v="$(cat "$STATE/pnpm_version" 2>/dev/null)"
  [ -n "$v" ] || exit 1
  echo "$v"
  exit 0
fi
if [ "${1:-}" = "install" ]; then
  tried="$(cat "$STATE/pnpm_installs" 2>/dev/null || echo 0)"
  tried=$((tried + 1))
  echo "$tried" > "$STATE/pnpm_installs"
  [ "$tried" -gt "${PNPM_INSTALL_FAILS:-0}" ] || exit 1
  for probe in $ALL_PROBES; do
    mkdir -p "$HOME/babybox/source/apps/${probe%%/*}/node_modules/${probe#*/}"
  done
fi
exit 0
EOF

  cat > "$bin/pm2" <<'EOF'
#!/bin/bash
echo "pm2 $*" >> "$CALLS"
if [ "${1:-}" = "--version" ]; then
  v="$(cat "$STATE/pm2_version" 2>/dev/null)"
  [ -n "$v" ] || exit 1
  echo "$v"
fi
exit 0
EOF

  cat > "$bin/git" <<'EOF'
#!/bin/bash
echo "git $* (cwd=$PWD)" >> "$CALLS"
[ "${1:-}" = "pull" ] || exit 0
[ "${GIT_PULL_EXIT:-0}" = "0" ] || { echo "fatal: could not read from remote"; exit 1; }
# Druhy pull uz nic nenajde - stejne jako na opravdovem pocitaci po re-execu
tried="$(cat "$STATE/git_pulls" 2>/dev/null || echo 0)"
tried=$((tried + 1))
echo "$tried" > "$STATE/git_pulls"
if [ "${GIT_PULL_UPDATED:-0}" = "1" ] && { [ "${GIT_PULL_ALWAYS:-0}" = "1" ] || [ "$tried" -eq 1 ]; }; then
  echo "Updating 1234567..89abcde"
  echo " 1 file changed, 1 insertion(+)"
else
  echo "Already up to date."
fi
EOF

  chmod +x "$bin"/node "$bin"/n "$bin"/npm "$bin"/pnpm "$bin"/pm2 "$bin"/git
}

# ----- Stroj testu -----------------------------------------------------------

ALL_PROBES="startup/winston backend/express configer/express panel/vue"

# Vychozi nastaveni pripadu. Volat pred kazdym testem.
reset_case() {
  STUB_NODE="v18.12.1"
  STUB_N="10.2.0"
  STUB_PNPM="7.5.0"
  STUB_PM2="6.0.14"
  N_EXIT=0
  NPM_INSTALL_EXIT=0
  PNPM_INSTALL_FAILS=0
  DROP_KEY=""          # klic, ktery se z versions.env vyhodi
  SEED_DEPS=""         # node_modules, ktere existuji uz pred spustenim
  GIT_PULL_EXIT=0      # 1 = pull selze (treba neni sit)
  GIT_PULL_UPDATED=0   # 1 = prvni pull neco stahne
  GIT_PULL_ALWAYS=0    # 1 = kazdy pull hlasi zmenu (test pojistky proti smycce)
}

run_case() {
  local sandbox home startup_dir probe
  sandbox="$(mktemp -d)"
  home="$sandbox/home"
  startup_dir="$home/babybox/source/apps/startup"

  STATE="$sandbox/state"
  CALLS="$sandbox/calls"
  LOG="$home/babybox/source/logs/startup.sh.log"
  mkdir -p "$STATE" "$startup_dir/scripts/ubuntu"
  : > "$CALLS"

  if [ -n "$DROP_KEY" ]; then
    grep -v "^$DROP_KEY=" "$SRC_STARTUP/versions.env" > "$startup_dir/versions.env"
  else
    cp "$SRC_STARTUP/versions.env" "$startup_dir/versions.env"
  fi
  cp "$SRC_STARTUP/scripts/ubuntu/startup.sh" "$startup_dir/scripts/ubuntu/startup.sh"
  write_stubs "$home/.npm-global/bin"

  for probe in $SEED_DEPS; do
    mkdir -p "$home/babybox/source/apps/${probe%%/*}/node_modules/${probe#*/}"
  done

  echo "$STUB_NODE" > "$STATE/node_version"
  echo "$STUB_N"    > "$STATE/n_version"
  echo "$STUB_PNPM" > "$STATE/pnpm_version"
  echo "$STUB_PM2"  > "$STATE/pm2_version"

  SANDBOX="$sandbox"
  # Casovy strop. Kdyby se re-exec zacyklil, test spadne misto toho, aby visel.
  # 'timeout' na macOS neni, tak si hlidace udelame sami.
  env -i \
    HOME="$home" \
    PATH="$home/.npm-global/bin:/usr/bin:/bin" \
    STATE="$STATE" CALLS="$CALLS" ALL_PROBES="$ALL_PROBES" \
    N_EXIT="$N_EXIT" \
    NPM_INSTALL_EXIT="$NPM_INSTALL_EXIT" \
    PNPM_INSTALL_FAILS="$PNPM_INSTALL_FAILS" \
    GIT_PULL_EXIT="$GIT_PULL_EXIT" \
    GIT_PULL_UPDATED="$GIT_PULL_UPDATED" \
    GIT_PULL_ALWAYS="$GIT_PULL_ALWAYS" \
    bash "$startup_dir/scripts/ubuntu/startup.sh" >"$sandbox/stdout" 2>&1 &
  local pid=$!
  ( sleep "${RUN_TIMEOUT:-30}"; kill -9 "$pid" 2>/dev/null ) >/dev/null 2>&1 &
  local watchdog=$!
  wait "$pid"
  RC=$?
  kill "$watchdog" 2>/dev/null
  wait "$watchdog" 2>/dev/null
  [ "$RC" -eq 137 ] && echo "  (skript byl zabit po ${RUN_TIMEOUT:-30}s - nejspis smycka)"
  return 0
}

pass() { PASSED=$((PASSED + 1)); }
fail() { FAILED=$((FAILED + 1)); echo "  FAIL: $1"; }

expect_called()     { grep -qF -- "$1" "$CALLS" && pass || fail "chybi volani: $1"; }
expect_not_called() { grep -qF -- "$1" "$CALLS" && fail "nemelo se volat: $1" || pass; }
expect_log()        { grep -qF -- "$1" "$LOG"   && pass || fail "chybi v logu: $1"; }
expect_no_log()     { grep -qF -- "$1" "$LOG"   && fail "nemelo byt v logu: $1" || pass; }
expect_rc()         { [ "$RC" = "$1" ] && pass || fail "navratovy kod $RC, cekali jsme $1"; }
expect_dir()        { [ -d "$1" ] && pass || fail "chybi slozka: $1"; }

# ----- Srovnavani verzi ------------------------------------------------------

echo "verze sedi -> nic se neinstaluje"
reset_case
run_case
expect_not_called "npm install -g"
expect_not_called "n 18.12.1"
expect_called "node src/index.js --ubuntu"
expect_rc 0

echo "vsechny verze spatne -> kazda se doinstaluje"
reset_case
STUB_NODE="v16.20.0"; STUB_N=""; STUB_PNPM="6.32.9"; STUB_PM2="5.2.0"
run_case
expect_called "npm install -g n@10.2.0"
expect_called "n 18.12.1"
expect_called "npm install -g pnpm@7.5.0"
expect_called "npm install -g pm2@6.0.14"
expect_called "pm2 update"
expect_rc 0

echo "n ma jinou verzi -> preinstaluje se na pinnutou"
reset_case
STUB_NODE="v16.20.0"; STUB_N="9.0.0"
run_case
expect_called "npm install -g n@10.2.0"
expect_called "n 18.12.1"

echo "instalace Node selze -> NODE_MISMATCH v logu, panel presto nabehne"
reset_case
STUB_NODE="v16.20.0"; N_EXIT=1
run_case
expect_log "NODE_MISMATCH"
expect_called "node src/index.js --ubuntu"
expect_rc 0

echo "versions.env bez PNPM_VERSION -> zadne 'pnpm@' bez verze"
reset_case
DROP_KEY="PNPM_VERSION"; STUB_PNPM="6.32.9"
run_case
expect_log "PNPM_VERSION chybi ve versions.env"
expect_not_called "npm install -g"
expect_called "node src/index.js --ubuntu"
expect_rc 0

# ----- Zavislosti ------------------------------------------------------------

echo "pnpm install projde -> panel nabehne"
reset_case
run_case
expect_called "pnpm install --frozen-lockfile"
expect_called "node src/index.js --ubuntu"
expect_rc 0

echo "pnpm install selze, ale zavislosti funguji -> node_modules zustanou"
reset_case
PNPM_INSTALL_FAILS=99; SEED_DEPS="$ALL_PROBES"
run_case
expect_log "Pokracuji se stavajicimi node_modules"
expect_dir "$SANDBOX/home/babybox/source/apps/backend/node_modules/express"
expect_called "node src/index.js --ubuntu"
expect_rc 0

echo "zavislosti chybi jen backendu -> cista instalace, i kdyz startup je v poradku"
reset_case
PNPM_INSTALL_FAILS=1; SEED_DEPS="startup/winston"
run_case
expect_log "Zavislosti nefunguji"
expect_dir "$SANDBOX/home/babybox/source/apps/backend/node_modules/express"
expect_called "node src/index.js --ubuntu"
expect_rc 0

echo "instalace selze i po vycisteni -> panel se nespousti"
reset_case
PNPM_INSTALL_FAILS=99
run_case
expect_log "Zavislosti se nepodarilo nainstalovat"
expect_not_called "node src/index.js --ubuntu"
expect_rc 1

# ----- git pull a re-exec ----------------------------------------------------

echo "pull nic nestahne -> zadny re-exec, node bez --updated"
reset_case
run_case
expect_called "git pull"
expect_log "Repozitar je aktualni"
expect_no_log "spoustim znovu"
expect_called "node src/index.js --ubuntu"
expect_not_called "node src/index.js --ubuntu --updated"
expect_rc 0

echo "pull nekde v korenu repozitare, ne v apps/startup"
reset_case
run_case
if grep -qF "git pull (cwd=$SANDBOX/home/babybox)" "$CALLS"; then pass; else fail "git pull nebezel v korenu repozitare"; fi

echo "pull stahne novy commit -> re-exec jednou a node dostane --updated"
reset_case
GIT_PULL_UPDATED=1
run_case
expect_log "Repozitar aktualizovan"
expect_log "spoustim znovu"
expect_called "node src/index.js --ubuntu --updated"
expect_rc 0
# Dva pully = presne jeden re-exec. Tri by znamenaly smycku.
if [ "$(cat "$STATE/git_pulls")" = "2" ]; then pass; else fail "ocekavali jsme 2 pully, bylo $(cat "$STATE/git_pulls")"; fi

echo "verze se srovnavaji az po pullu"
reset_case
GIT_PULL_UPDATED=1; STUB_PNPM="6.32.9"
run_case
# npm install -g smi prijit az za prvnim pullem, jinak by cetl stary versions.env
first_pull="$(grep -n "^git pull" "$CALLS" | head -1 | cut -d: -f1)"
first_npm="$(grep -n "^npm install -g" "$CALLS" | head -1 | cut -d: -f1)"
if [ -n "$first_npm" ] && [ "$first_pull" -lt "$first_npm" ]; then pass; else fail "verze se srovnaly pred pullem"; fi

echo "pull hlasi zmenu i podruhe -> pojistka zastavi smycku po jednom re-execu"
reset_case
GIT_PULL_UPDATED=1; GIT_PULL_ALWAYS=1
run_case
if [ "$(cat "$STATE/git_pulls")" = "2" ]; then pass; else fail "smycka: $(cat "$STATE/git_pulls") pullu misto 2"; fi
expect_called "node src/index.js --ubuntu --updated"
expect_rc 0

echo "pull selze -> panel presto nabehne, bez --updated"
reset_case
GIT_PULL_EXIT=1
run_case
expect_log "git pull selhal"
expect_called "node src/index.js --ubuntu"
expect_not_called "node src/index.js --ubuntu --updated"
expect_rc 0

# ----- Vysledek --------------------------------------------------------------

echo ""
echo "prosly: $PASSED, selhaly: $FAILED"
[ "$FAILED" -eq 0 ]
