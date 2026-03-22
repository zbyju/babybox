# Babybox Panel — Dokumentace pro techniky

Systém pro nepřetržité monitorování babyboxů v nemocnicích. Skládá se ze tří aplikací, které spolu komunikují.

## Struktura projektu

```
babybox/
├── source/apps/
│   ├── backend/        # Server (API) — komunikuje s jednotkami babyboxu
│   ├── panel/          # Webová aplikace — zobrazuje data na monitoru
│   ├── startup-v2/     # Startovací program — aktualizuje a spouští systém
│   └── startup/        # Starý startovací program (nepoužívat)
├── package.json        # Hlavní konfigurační soubor projektu
└── turbo.json          # Nastavení pro spouštění všech aplikací najednou
```

## Co potřebujete mít nainstalované

### Windows

1. **Bun** — stáhněte z https://bun.sh a nainstalujte
   - Otevřete PowerShell jako správce a spusťte:
     ```powershell
     powershell -c "irm bun.sh/install.ps1 | iex"
     ```
   - Zavřete a znovu otevřete PowerShell

2. **Git** — stáhněte z https://git-scm.com/download/win a nainstalujte
   - Při instalaci nechte výchozí nastavení

3. **PM2** (pro produkční nasazení) — po instalaci Bunu spusťte:
   ```powershell
   bun install -g pm2
   ```

### Ubuntu

1. **Bun**:
   ```bash
   curl -fsSL https://bun.sh/install | bash
   source ~/.bashrc
   ```

2. **Git**:
   ```bash
   sudo apt update && sudo apt install -y git
   ```

3. **PM2** (pro produkční nasazení):
   ```bash
   bun install -g pm2
   ```

## Jak spustit systém poprvé

### Windows

1. Otevřete PowerShell a přejděte do složky projektu:
   ```powershell
   cd C:\cesta\k\babybox
   ```

2. Nainstalujte závislosti:
   ```powershell
   bun install
   ```

3. Vytvořte konfigurační soubor:
   ```powershell
   copy source\apps\backend\configs\base.json source\apps\backend\configs\main.json
   ```

4. Upravte konfiguraci — otevřete soubor `source\apps\backend\configs\main.json` v libovolném textovém editoru (Notepad, VS Code) a nastavte:
   - `units.engine.ip` — IP adresa řídicí jednotky (výchozí: `10.1.1.5`)
   - `units.thermal.ip` — IP adresa tepelné jednotky (výchozí: `10.1.1.6`)
   - `camera.ip` — IP adresa kamery (výchozí: `10.1.1.7`)
   - `camera.cameraType` — typ kamery (`dahua`, `hikvision`, `avtech` nebo `vivotek`)
   - `app.password` — heslo pro přístup k nastavení
   - `babybox.name` — název tohoto babyboxu

5. Spusťte systém:
   ```powershell
   bun dev
   ```

### Ubuntu

1. Otevřete terminál a přejděte do složky projektu:
   ```bash
   cd /cesta/k/babybox
   ```

2. Nainstalujte závislosti:
   ```bash
   bun install
   ```

3. Vytvořte konfigurační soubor:
   ```bash
   cp source/apps/backend/configs/base.json source/apps/backend/configs/main.json
   ```

4. Upravte konfiguraci:
   ```bash
   nano source/apps/backend/configs/main.json
   ```
   Nastavte stejné hodnoty jako v popisu pro Windows výše. Uložte: `Ctrl+O`, `Enter`, `Ctrl+X`.

5. Spusťte systém:
   ```bash
   bun dev
   ```

Po spuštění bude webový panel dostupný na `http://localhost:3002` a API server na `http://localhost:3000`.

## Nejčastější změny

### Změna IP adresy jednotky

Otevřete `source/apps/backend/configs/main.json` a změňte:
```json
"units": {
  "engine": {
    "ip": "NOVA_IP_ADRESA"
  },
  "thermal": {
    "ip": "NOVA_IP_ADRESA"
  }
}
```

### Změna hesla

V souboru `source/apps/backend/configs/main.json` změňte:
```json
"app": {
  "password": "NOVE_HESLO"
}
```

### Změna typu kamery

V souboru `source/apps/backend/configs/main.json` změňte `cameraType` na jednu z hodnot:
- `dahua` — kamery Dahua
- `hikvision` — kamery Hikvision
- `avtech` / `avm` — kamery Avtech
- `vivotek` — kamery Vivotek

### Změna intervalu obnovování dat

V souboru `source/apps/backend/configs/main.json` změňte `units.requestDelay` (hodnota v milisekundách, výchozí je `2000` = 2 sekundy).

## Spuštění v produkci

### Windows

```powershell
cd C:\cesta\k\babybox
bun start:main
```

Pro zastavení:
```powershell
bun stop
```

### Ubuntu

```bash
cd /cesta/k/babybox
bun start:main
```

Pro zastavení:
```bash
bun stop
```

## Aktualizace systému

Aktualizace se provádí pomocí programu startup-v2, který stáhne novou verzi kódu, sestaví aplikace a restartuje služby.

### Windows

Spusťte zkompilovaný soubor:
```powershell
.\source\apps\startup-v2\dist\startup-windows.exe --windows
```

### Ubuntu

```bash
./source/apps/startup-v2/dist/startup-ubuntu --ubuntu
```

## Řešení problémů

### Systém se nespustí

1. Zkontrolujte, že je nainstalovaný Bun: spusťte `bun --version`
2. Zkontrolujte, že existuje soubor `source/apps/backend/configs/main.json`
3. Zkuste přeinstalovat závislosti: `bun install`

### Panel se nenačítá / ukazuje chybu připojení

1. Zkontrolujte, že backend běží na portu 3000
2. Zkontrolujte IP adresy jednotek v `main.json`
3. Zkontrolujte, že jsou jednotky babyboxu dostupné (ping na jejich IP adresy)

### Kamera nefunguje

1. Ověřte IP adresu kamery v `main.json`
2. Ověřte, že je nastavený správný typ kamery (`cameraType`)
3. Zkontrolujte přihlašovací údaje kamery (`camera.username`, `camera.password`)
