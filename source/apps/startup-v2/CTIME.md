# Startup v2 — Dokumentace pro techniky

Startup je program, který automaticky aktualizuje a spouští babybox systém. Je zkompilovaný do jednoho spustitelného souboru pro každý operační systém.

## Co program dělá

Při spuštění provede postupně tyto kroky:

1. **Aktualizace** — stáhne nejnovější verzi kódu z Gitu
2. **Sestavení** — nainstaluje závislosti a sestaví všechny aplikace
3. **Přepsání konfigurace** — aplikuje lokální nastavení
4. **Spuštění procesů** — spustí backend přes PM2

Pokud některý krok selže, program zobrazí doporučení k vyřešení problému.

## Spuštění

### Windows

Spusťte zkompilovaný soubor v PowerShell:

```powershell
cd C:\cesta\k\babybox
.\source\apps\startup-v2\dist\startup-windows.exe --windows
```

### Ubuntu

```bash
cd /cesta/k/babybox
./source/apps/startup-v2/dist/startup-ubuntu --ubuntu
```

### macOS (pro vývoj)

```bash
cd /cesta/k/babybox
./source/apps/startup-v2/dist/startup-mac --mac
```

## Proměnné prostředí

Program je možné ovlivnit nastavením proměnných prostředí:

| Proměnná              | Popis                              | Příklad                                |
| --------------------- | ---------------------------------- | -------------------------------------- |
| `BABYBOX_REPO_PATH`   | Cesta k repozitáři babyboxu        | `C:\babybox` nebo `/home/user/babybox` |
| `BABYBOX_LOG_LEVEL`   | Úroveň logování                    | `debug`, `info`, `warn`, `error`       |
| `BABYBOX_MAX_RETRIES` | Maximální počet pokusů při selhání | `3`                                    |

### Nastavení proměnných prostředí

#### Windows (PowerShell)

```powershell
$env:BABYBOX_REPO_PATH = "C:\babybox"
$env:BABYBOX_LOG_LEVEL = "debug"
.\source\apps\startup-v2\dist\startup-windows.exe --windows
```

#### Ubuntu

```bash
export BABYBOX_REPO_PATH="/home/user/babybox"
export BABYBOX_LOG_LEVEL="debug"
./source/apps/startup-v2/dist/startup-ubuntu --ubuntu
```

## Kompilace (vytvoření spustitelného souboru)

Pokud potřebujete zkompilovat novou verzi startup programu:

### Windows

```powershell
cd C:\cesta\k\babybox\source\apps\startup-v2
bun run build:windows
```

Výstup: `dist/startup-windows.exe`

### Ubuntu

```bash
cd /cesta/k/babybox/source/apps/startup-v2
bun run build:ubuntu
```

Výstup: `dist/startup-ubuntu`

### Všechny platformy najednou

```bash
bun run build:all
```

## Struktura programu

```
startup-v2/
├── src/
│   ├── presentation/       # CLI rozhraní (zpracování argumentů, výpis)
│   ├── application/        # Logika orchestrace (update, build, start)
│   ├── domain/             # Čistá logika (typy, strategie, opakování)
│   └── infrastructure/     # Komunikace se systémem (shell, soubory, PM2)
│       └── adapters/       # Implementace pro každý OS
│           ├── windows/
│           ├── ubuntu/
│           └── mac/
└── dist/                   # Zkompilované binární soubory
```

## Řešení problémů

### Program selže při aktualizaci (git pull)

- Zkontrolujte připojení k internetu
- Zkontrolujte, že je Git nainstalovaný: `git --version`
- Zkontrolujte, že nedošlo ke konfliktu v Gitu (lokální změny blokující pull)

### Program selže při sestavení (build)

- Zkontrolujte, že je nainstalovaný Bun: `bun --version`
- Zkuste ručně spustit: `bun install` a poté `bun run build` v kořenovém adresáři

### Program selže při spuštění procesů

- Zkontrolujte, že je nainstalovaný PM2: `pm2 --version`
- Zkontrolujte, že existuje konfigurační soubor `source/apps/backend/configs/main.json`
- Zkontrolujte logy PM2: `pm2 logs`
