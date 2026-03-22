# Backend — Dokumentace pro techniky

Backend je serverová aplikace, která komunikuje s hardwarovými jednotkami babyboxu (řídicí a tepelná jednotka) a poskytuje data webovému panelu.

## Struktura

```
backend/
├── src/                    # Zdrojový kód
│   ├── index.ts            # Hlavní soubor — spouští server
│   ├── fetch/              # Komunikace s jednotkami babyboxu
│   ├── routes/             # API endpointy (engine, thermal, config, health)
│   ├── services/config/    # Správa konfigurace
│   ├── schemas/            # Validace dat (Zod)
│   └── utils/              # Pomocné funkce
├── configs/                # Konfigurační soubory
│   ├── base.json           # Výchozí šablona (neměnit)
│   └── main.json           # Lokální konfigurace (hlavní soubor k editaci)
└── logs/                   # Logy serveru (vytvořeno automaticky)
```

## Konfigurace

Hlavní konfigurační soubor je `configs/main.json`. Tento soubor **není** verzovaný v Gitu — je specifický pro každou instalaci.

### Vytvoření konfigurace

#### Windows

```powershell
cd source\apps\backend\configs
copy base.json main.json
```

#### Ubuntu

```bash
cd source/apps/backend/configs
cp base.json main.json
```

Poté otevřete `main.json` a upravte hodnoty podle potřeby.

### Nejdůležitější nastavení

| Klíč                     | Popis                         | Výchozí hodnota |
| ------------------------ | ----------------------------- | --------------- |
| `babybox.name`           | Název babyboxu                | `"Nenastaveno"` |
| `backend.port`           | Port serveru                  | `3000`          |
| `backend.requestTimeout` | Timeout pro požadavky (ms)    | `5000`          |
| `units.engine.ip`        | IP řídicí jednotky            | `"10.1.1.5"`    |
| `units.thermal.ip`       | IP tepelné jednotky           | `"10.1.1.6"`    |
| `units.requestDelay`     | Interval dotazování (ms)      | `2000`          |
| `camera.ip`              | IP kamery                     | `"10.1.1.7"`    |
| `camera.cameraType`      | Typ kamery                    | `"dahua"`       |
| `camera.username`        | Uživatelské jméno kamery      | `"username"`    |
| `camera.password`        | Heslo kamery                  | `"password"`    |
| `app.password`           | Heslo pro přístup k nastavení | `"password"`    |
| `pc.os`                  | Operační systém               | `"windows"`     |

## Spuštění

### Vývoj (s automatickým restartem při změně)

#### Windows

```powershell
cd C:\cesta\k\babybox
bun dev:backend
```

#### Ubuntu

```bash
cd /cesta/k/babybox
bun dev:backend
```

### Produkce (přes PM2)

#### Windows

```powershell
cd C:\cesta\k\babybox
bun start:main
```

#### Ubuntu

```bash
cd /cesta/k/babybox
bun start:main
```

Server poběží na `http://localhost:3000`.

## API Endpointy

| Cesta                                    | Metoda | Popis                      |
| ---------------------------------------- | ------ | -------------------------- |
| `/api/v1/engine/data`                    | GET    | Data z řídicí jednotky     |
| `/api/v1/thermal/data`                   | GET    | Data z tepelné jednotky    |
| `/api/v1/units/settings`                 | GET    | Nastavení jednotek         |
| `/api/v1/units/settings`                 | PUT    | Změna nastavení jednotek   |
| `/api/v1/units/actions/open`             | GET    | Otevření předních dvířek   |
| `/api/v1/units/actions/openServiceDoors` | GET    | Otevření servisních dvířek |
| `/api/v1/config`                         | GET    | Čtení konfigurace          |
| `/api/v1/config`                         | PUT    | Zápis konfigurace          |
| `/api/v1/health`                         | GET    | Kontrola stavu serveru     |

## Logy

Server automaticky zapisuje logy do složky `logs/`. Při problémech zkontrolujte obsah těchto logů.

#### Windows

```powershell
type source\apps\backend\logs\*.log
```

#### Ubuntu

```bash
cat source/apps/backend/logs/*.log
```
