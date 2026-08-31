#!/bin/bash
# =============================================================================
# Babybox — instalace paneloveho pocitace (Ubuntu)
#
# Nainstaluje a nakonfiguruje vse potrebne pro beh Babybox panelu
# na cerstve nainstalovanem Ubuntu (22.04 nebo novejsi, Desktop).
#
# Pouziti (na cilovem pocitaci, prihlaseny jako bezny uzivatel):
#
#   wget -qO- https://gist.githubusercontent.com/zbyju/23716b0d96f59a07ed0ec5b675f8791d/raw/install-all.sh | bash
#
# nebo lokalne:
#
#   bash install-all.sh
#
# Skript je bezpecne spustit opakovane — kazdy krok nejdrive zkontroluje,
# zda uz neni hotovy.
# =============================================================================
set -Eeuo pipefail

NODE_VERSION="18.12.1"
PNPM_VERSION="7.5.0"
GITHUB_USER="babybox@jurica-montel.cz"
FIREFOX_EXTENSION_ID="{d320c473-63c2-47ab-87f8-693b1badb5e3}"
FIREFOX_EXTENSION_URL="https://addons.mozilla.org/firefox/downloads/latest/autofullscreen/latest.xpi"

TOTAL_STEPS=13
CURRENT_STEP=0
CURRENT_STEP_NAME="priprava"
SUDO_KEEPALIVE_PID=""
SCREEN_SETTINGS_OK=0
REAL_USER="$(id -un)"

# apt vzdy bez interaktivnich dotazu — sudo ma env_reset,
# takze promenne musi projit pres 'env', jinak by je zahodil
apt_noninteractive() {
  sudo env DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a apt-get -y -q "$@"
}

# ----- Vypis pro uzivatele ---------------------------------------------------

BOLD=$(tput bold 2>/dev/null || true)
RED=$(tput setaf 1 2>/dev/null || true)
GREEN=$(tput setaf 2 2>/dev/null || true)
YELLOW=$(tput setaf 3 2>/dev/null || true)
BLUE=$(tput setaf 4 2>/dev/null || true)
RESET=$(tput sgr0 2>/dev/null || true)

step() {
  CURRENT_STEP=$((CURRENT_STEP + 1))
  CURRENT_STEP_NAME="$1"
  echo ""
  echo "${BOLD}${BLUE}[${CURRENT_STEP}/${TOTAL_STEPS}] $1${RESET}"
}

info() { echo "  $1"; }
ok() { echo "  ${GREEN}OK${RESET} - $1"; }
warn() { echo "  ${YELLOW}POZOR${RESET} - $1"; }

action_required() {
  echo ""
  echo "  ${BOLD}${YELLOW}>>> TED JE POTREBA VASE AKCE <<<${RESET}"
  echo "  $1"
  echo ""
}

die() {
  echo "" >&2
  echo "${BOLD}${RED}CHYBA:${RESET} $1" >&2
  echo "" >&2
  exit 1
}

on_error() {
  echo "" >&2
  echo "${BOLD}${RED}=============================================${RESET}" >&2
  echo "${BOLD}${RED}INSTALACE SELHALA${RESET}" >&2
  echo "Krok, ktery selhal: ${BOLD}${CURRENT_STEP_NAME}${RESET} (radek $1)" >&2
  echo "" >&2
  echo "Co delat:" >&2
  echo "  1. Prectete si chybovou hlasku vyse." >&2
  echo "  2. Zkontrolujte pripojeni k internetu." >&2
  echo "  3. Skript je bezpecne spustit znovu — hotove kroky se preskoci." >&2
  echo "${BOLD}${RED}=============================================${RESET}" >&2
}

cleanup() {
  if [ -n "$SUDO_KEEPALIVE_PID" ]; then
    kill "$SUDO_KEEPALIVE_PID" 2>/dev/null || true
  fi
}

trap 'on_error $LINENO' ERR
trap cleanup EXIT

echo ""
echo "${BOLD}=============================================${RESET}"
echo "${BOLD}  Babybox — instalace paneloveho pocitace${RESET}"
echo "${BOLD}=============================================${RESET}"

# ----- 1/13 Kontroly pred instalaci ------------------------------------------

step "Kontroly pred instalaci"

if [ "$(id -u)" -eq 0 ]; then
  die "Skript nespoustejte jako root ani pres 'sudo bash'.
Spustte ho jako bezny uzivatel — o heslo si rekne sam."
fi

if [ ! -r /etc/os-release ]; then
  die "Nelze precist /etc/os-release — toto neni podporovany system."
fi
# shellcheck disable=SC1091
. /etc/os-release
if [ "${ID:-}" != "ubuntu" ]; then
  die "Tento skript funguje jen na Ubuntu (detekovano: ${ID:-nezname})."
fi
UBUNTU_MAJOR="${VERSION_ID%%.*}"
if [ "$UBUNTU_MAJOR" -lt 22 ]; then
  die "Je potreba Ubuntu 22.04 nebo novejsi (detekovano: $VERSION_ID).
Nainstalujte prosim novejsi Ubuntu a spustte skript znovu."
fi
ok "Ubuntu $VERSION_ID"

ARCH="$(uname -m)"
if [ "$ARCH" != "x86_64" ]; then
  die "Je potreba pocitac s procesorem x86_64 (detekovano: $ARCH).
TeamViewer a dalsi soucasti na teto architekture nefunguji."
fi
ok "Architektura x86_64"

info "Kontroluji pripojeni k internetu..."
if ! getent hosts github.com >/dev/null 2>&1; then
  die "Nefunguje preklad domenovych jmen (DNS).
Pocitac je nejspis bez internetu, nebo je spatne nastavena sit.
Zkontrolujte sitovy kabel / Wi-Fi a spustte skript znovu."
fi
for host in github.com download.teamviewer.com addons.mozilla.org api.snapcraft.io \
  archive.ubuntu.com registry.npmjs.org nodejs.org; do
  if ! wget -q --spider --timeout=15 "https://$host" 2>/dev/null; then
    die "Nelze se pripojit k $host.
Pocitac nejspis nema pristup k internetu (nebo ho blokuje firewall).
Bez internetu nelze v instalaci pokracovat.
Zkontrolujte sitovy kabel / Wi-Fi a spustte skript znovu."
  fi
done
ok "Internet i DNS funguji"

action_required "Zadejte heslo uzivatele '$REAL_USER' (pro instalaci systemovych balicku)."
if ! sudo -v; then
  die "Nepodarilo se ziskat opravneni spravce (sudo). Zkuste to znovu."
fi
# Drzi sudo aktivni po celou dobu behu, aby se heslo nechtelo znovu
( while true; do
    sudo -n true 2>/dev/null || exit
    sleep 60
  done ) &
SUDO_KEEPALIVE_PID=$!
ok "Opravneni spravce ziskano"

# ----- 2/13 Aktualizace systemu ----------------------------------------------

step "Aktualizace systemu (apt update + upgrade)"
info "Muze trvat nekolik minut..."
apt_noninteractive update
apt_noninteractive upgrade \
  -o Dpkg::Options::="--force-confdef" \
  -o Dpkg::Options::="--force-confold"
ok "System je aktualni"

# ----- 3/13 Zakladni nastroje ------------------------------------------------

step "Instalace zakladnich nastroju"
# curl/git/jq/unzip potrebuje tento skript;
# zbytek jsou nastroje pro diagnostiku site a spravu pocitace na miste
BASE_PACKAGES=(
  curl wget git ca-certificates gnupg unzip jq
  net-tools dnsutils traceroute mtr-tiny nmap ethtool
  htop vim tree lsof
  fonts-open-sans
)
MISSING_PACKAGES=()
for pkg in "${BASE_PACKAGES[@]}"; do
  if ! dpkg -s "$pkg" >/dev/null 2>&1; then
    MISSING_PACKAGES+=("$pkg")
  fi
done
if [ "${#MISSING_PACKAGES[@]}" -gt 0 ]; then
  info "Instaluji: ${MISSING_PACKAGES[*]}"
  apt_noninteractive install "${MISSING_PACKAGES[@]}"
else
  info "Vsechny nastroje uz jsou nainstalovane."
fi
ok "Zakladni nastroje pripraveny"

# ----- 4/13 TeamViewer ---------------------------------------------------------

step "Instalace TeamVieweru (vzdalena sprava)"
if dpkg -s teamviewer >/dev/null 2>&1; then
  info "TeamViewer uz je nainstalovany, preskakuji."
else
  TMP_DIR="$(mktemp -d)"
  TMP_DEB="$TMP_DIR/teamviewer_amd64.deb"
  info "Stahuji TeamViewer..."
  wget -q --show-progress -O "$TMP_DEB" \
    "https://download.teamviewer.com/download/linux/teamviewer_amd64.deb"
  info "Instaluji TeamViewer..."
  apt_noninteractive install "$TMP_DEB"
  rm -rf "$TMP_DIR"
fi
# Vypnuti Waylandu — bez toho se pres TeamViewer nejde pripojit bez potvrzeni
# od uzivatele u pocitace
if [ -f /etc/gdm3/custom.conf ]; then
  if grep -Eq '^\s*WaylandEnable\s*=\s*false' /etc/gdm3/custom.conf; then
    info "Wayland uz je vypnuty."
  else
    sudo sed -i 's/^#\s*WaylandEnable=false/WaylandEnable=false/' /etc/gdm3/custom.conf
    if ! grep -Eq '^\s*WaylandEnable\s*=\s*false' /etc/gdm3/custom.conf; then
      sudo sed -i '/^\[daemon\]/a WaylandEnable=false' /etc/gdm3/custom.conf
    fi
    if grep -Eq '^\s*WaylandEnable\s*=\s*false' /etc/gdm3/custom.conf; then
      info "Wayland vypnut (projevi se po restartu)."
    else
      warn "Wayland se nepodarilo vypnout — pridejte 'WaylandEnable=false'
  do sekce [daemon] v /etc/gdm3/custom.conf rucne."
    fi
  fi
else
  warn "/etc/gdm3/custom.conf neexistuje — Wayland nebylo mozne vypnout."
fi
ok "TeamViewer pripraven"

# ----- 5/13 Node.js -------------------------------------------------------------

step "Instalace Node.js $NODE_VERSION"
if ! command -v npm >/dev/null 2>&1; then
  info "Instaluji npm..."
  apt_noninteractive install npm
fi

# Globalni npm balicky bez sudo — vlastni adresar v home
NPM_GLOBAL_DIR="$HOME/.npm-global"
mkdir -p "$NPM_GLOBAL_DIR"
npm config set prefix "$NPM_GLOBAL_DIR"
export PATH="$NPM_GLOBAL_DIR/bin:$PATH"
for rcfile in "$HOME/.bashrc" "$HOME/.profile"; do
  touch "$rcfile"
  if ! grep -q "npm-global/bin" "$rcfile"; then
    # $HOME se ma rozvinout az pri startu shellu, proto jednoduche uvozovky
    # shellcheck disable=SC2016
    echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> "$rcfile"
  fi
done

CURRENT_NODE="$(node -v 2>/dev/null || echo none)"
if [ "$CURRENT_NODE" = "v$NODE_VERSION" ]; then
  info "Node.js $NODE_VERSION uz je nainstalovany."
else
  if ! command -v n >/dev/null 2>&1; then
    info "Instaluji spravce verzi 'n'..."
    npm install -g n
  fi
  # 'n' instaluje do /usr/local — predame ho uzivateli, aby nebylo potreba sudo
  sudo mkdir -p /usr/local/n /usr/local/bin /usr/local/lib /usr/local/include /usr/local/share
  sudo chown -R "$REAL_USER" /usr/local/n /usr/local/bin /usr/local/lib /usr/local/include /usr/local/share
  info "Instaluji Node.js $NODE_VERSION..."
  n "$NODE_VERSION"
  hash -r
fi
ok "Node.js $(node -v)"

# ----- 6/13 Odebrani spravce aktualizaci ----------------------------------------

step "Odebrani spravce aktualizaci (vyskakovaci okna)"
if dpkg -s update-manager >/dev/null 2>&1; then
  apt_noninteractive remove update-manager
  info "update-manager odebran."
else
  info "update-manager uz je odebrany."
fi
ok "Zadna vyskakovaci okna s aktualizacemi"

# ----- 7/13 Wine ------------------------------------------------------------------

step "Instalace Wine (pro konfiguracni nastroje ridicich jednotek)"
if dpkg -s wine >/dev/null 2>&1; then
  info "Wine uz je nainstalovany, preskakuji."
else
  info "Instaluji Wine (muze trvat nekolik minut)..."
  apt_noninteractive install wine
fi
ok "Wine pripraven"

# ----- 8/13 Stazeni repozitaru -------------------------------------------------

step "Stazeni programu Babybox (repozitare z GitHubu)"
git config --global credential.helper store

# Token pro pristup k privatnimu repozitari BB:
# zkusime ho najit na flash disku (soubor github-token.txt)
TOKEN_FILE=""
shopt -s nullglob
for f in /media/"$REAL_USER"/*/github-token.txt /media/*/github-token.txt; do
  if [ -r "$f" ]; then
    TOKEN_FILE="$f"
    break
  fi
done
shopt -u nullglob

if [ -n "$TOKEN_FILE" ]; then
  info "Nasel jsem token na flash disku: $TOKEN_FILE"
  GITHUB_TOKEN="$(tr -d '[:space:]' < "$TOKEN_FILE")"
  if [ -n "$GITHUB_TOKEN" ]; then
    printf 'protocol=https\nhost=github.com\nusername=%s\npassword=%s\n\n' \
      "$GITHUB_USER" "$GITHUB_TOKEN" | git credential approve
    ok "Prihlaseni ke GitHubu nastaveno automaticky"
  else
    warn "Soubor s tokenem je prazdny — Git se zepta na prihlaseni rucne."
    TOKEN_FILE=""
  fi
fi

if [ -z "$TOKEN_FILE" ] && ! grep -qs "github.com" "$HOME/.git-credentials"; then
  action_required "Za chvili budete pozadani o prihlaseni ke GitHubu:
    Username: $GITHUB_USER
    Password: pouzijte TOKEN (dlouhy retezec znaku), NE bezne heslo.
  Token najdete:
    - v aplikaci Bitwarden pod uctem $GITHUB_USER
    - nebo v souboru github-token.txt na flash disku s timto skriptem.
  Prihlaseni se ulozi — priste uz nebude potreba."
fi

clone_or_update() {
  local url="$1" dir="$2"
  if [ -d "$dir/.git" ]; then
    info "Repozitar $dir uz existuje — aktualizuji (git pull)..."
    git -C "$dir" pull
  else
    info "Stahuji $url..."
    git clone "$url" "$dir"
  fi
}

clone_or_update "https://github.com/zbyju/babybox.git" "$HOME/babybox"
clone_or_update "https://github.com/zbyju/BB.git" "$HOME/BB"
ok "Repozitare stazeny"

BABYBOX_DIR="$HOME/babybox"
UBUNTU_SCRIPTS_DIR="$BABYBOX_DIR/source/apps/startup/scripts/ubuntu"
chmod 755 "$UBUNTU_SCRIPTS_DIR/startup.sh" \
  "$UBUNTU_SCRIPTS_DIR/install.sh" \
  "$UBUNTU_SCRIPTS_DIR/internet_check.sh" \
  "$UBUNTU_SCRIPTS_DIR/install-all.sh" 2>/dev/null || true

# ----- 9/13 Firefox ----------------------------------------------------------------

step "Instalace a nastaveni Firefoxu"
if snap list firefox >/dev/null 2>&1; then
  info "Aktualizuji Firefox (snap refresh)..."
  if ! sudo snap refresh firefox; then
    warn "Firefox se nepodarilo aktualizovat — nejspis prave bezi.
  Zavrete Firefox a spustte skript znovu, nebo aktualizaci nechte na pozdeji."
  fi
else
  info "Instaluji Firefox (snap install)..."
  sudo snap install firefox
fi

# Firemni politiky Firefoxu:
#  - automaticka instalace rozsireni AutoFullscreen
#  - povoleni prehravani zvuku bez interakce uzivatele (vsechny weby)
info "Zapisuji politiky Firefoxu (rozsireni + povoleni zvuku)..."
POLICIES_TMP="$(mktemp)"
cat > "$POLICIES_TMP" <<POLICIES
{
  "policies": {
    "ExtensionSettings": {
      "$FIREFOX_EXTENSION_ID": {
        "installation_mode": "force_installed",
        "install_url": "$FIREFOX_EXTENSION_URL"
      }
    },
    "Permissions": {
      "Autoplay": {
        "Default": "allow-audio-video",
        "Locked": true
      }
    }
  }
}
POLICIES
if ! jq empty "$POLICIES_TMP" 2>/dev/null; then
  die "Vygenerovany policies.json neni platny JSON — chyba ve skriptu."
fi
sudo mkdir -p /etc/firefox/policies
sudo install -m 644 "$POLICIES_TMP" /etc/firefox/policies/policies.json
rm -f "$POLICIES_TMP"
ok "Firefox nastaven (rozsireni AutoFullscreen + povoleny zvuk se nainstaluji pri prvnim spusteni)"

# ----- 10/13 Automaticke spusteni panelu -------------------------------------------

step "Automaticke spusteni panelu po prihlaseni"
mkdir -p "$HOME/.config/autostart"
cat > "$HOME/.config/autostart/babybox.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Babybox
Exec=$UBUNTU_SCRIPTS_DIR/startup.sh
Comment=BabyboxPanel
X-GNOME-Autostart-enabled=true
DESKTOP
ok "Panel se spusti automaticky po prihlaseni"

# ----- 11/13 Hlidani pripojeni (automaticky restart) --------------------------------

step "Hlidani pripojeni a pravidelny restart (cron)"
sudo touch /var/restart_lock /var/log/internet_check.log
sudo chmod 644 /var/restart_lock /var/log/internet_check.log
CRON_LINE="* * * * * $UBUNTU_SCRIPTS_DIR/internet_check.sh"
CRON_TMP="$(mktemp)"
sudo crontab -l 2>/dev/null | grep -v "internet_check.sh" > "$CRON_TMP" || true
echo "$CRON_LINE" >> "$CRON_TMP"
sudo crontab "$CRON_TMP"
rm -f "$CRON_TMP"
ok "Pocitac se restartuje pri ztrate pripojeni a kazde pondeli ve 12:00"

# ----- 12/13 Nastaveni obrazovky -----------------------------------------------------

step "Vypnuti zhasinani obrazovky a uspavani"
if gsettings set org.gnome.desktop.session idle-delay 0 2>/dev/null; then
  gsettings set org.gnome.desktop.screensaver lock-enabled false 2>/dev/null || true
  gsettings set org.gnome.desktop.screensaver idle-activation-enabled false 2>/dev/null || true
  gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-type 'nothing' 2>/dev/null || true
  gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-battery-type 'nothing' 2>/dev/null || true
  SCREEN_SETTINGS_OK=1
  ok "Obrazovka zustane porad zapnuta"
else
  warn "Nepodarilo se zmenit nastaveni obrazovky (skript nebezi v grafickem prostredi).
  Spustte skript znovu z terminalu na plose, nebo nastaveni zmente rucne."
fi

# ----- 13/13 Instalace a spusteni panelu ---------------------------------------------

step "Instalace zavislosti panelu a prvni spusteni"
info "Toto je nejdelsi krok — muze trvat i vice nez 10 minut."
if [ "$(pnpm --version 2>/dev/null || echo none)" != "$PNPM_VERSION" ]; then
  info "Instaluji pnpm $PNPM_VERSION..."
  npm install -g "pnpm@$PNPM_VERSION"
fi
cd "$BABYBOX_DIR/source/apps/startup"
info "Instaluji zavislosti (pnpm install)..."
pnpm install
info "Spoustim instalaci a prvni start panelu..."
node src/index.js --install --ubuntu
ok "Panel nainstalovan a spusten"

# ----- Hotovo -----------------------------------------------------------------------

echo ""
echo "${BOLD}${GREEN}=============================================${RESET}"
echo "${BOLD}${GREEN}  INSTALACE DOKONCENA${RESET}"
echo "${BOLD}${GREEN}=============================================${RESET}"
echo ""
echo "Co bylo nainstalovano a nastaveno:"
echo "  - System aktualizovan, zakladni a sitove nastroje"
echo "  - TeamViewer (Wayland vypnut)"
echo "  - Node.js $NODE_VERSION, pnpm $PNPM_VERSION"
echo "  - Wine"
echo "  - Repozitare babybox a BB v $HOME"
echo "  - Firefox (snap) + rozsireni AutoFullscreen + povoleny zvuk"
echo "  - Automaticke spusteni panelu po prihlaseni"
echo "  - Hlidani pripojeni s automatickym restartem"
if [ "$SCREEN_SETTINGS_OK" -eq 1 ]; then
  echo "  - Obrazovka se nezhasina ani neuspava"
fi
echo ""
echo "${BOLD}Zbyvajici rucni kroky:${RESET}"
echo "  1. RESTARTUJTE POCITAC (sudo reboot) — panel se pak spusti sam."
echo "  2. V TeamVieweru nastavte trvaly pristup (prirazeni k uctu)."
echo "  3. Po restartu zkontrolujte, ze panel bezi a ze hraji zvuky."
if [ "$SCREEN_SETTINGS_OK" -eq 0 ]; then
  echo "  4. Nastaveni obrazovky se nepodarilo zmenit — vypnete zhasinani,"
  echo "     zamykani a uspavani rucne (viz upozorneni u kroku 12 vyse)."
fi
echo ""
