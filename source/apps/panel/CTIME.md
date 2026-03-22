# Panel — Dokumentace pro techniky

Panel je webová aplikace (zobrazuje se v prohlížeči), která slouží jako hlavní monitorovací nástroj babyboxu. Zobrazuje data ze senzorů, obraz z kamery a přehrává zvukové alarmy.

## Struktura

```
panel/
├── src/                    # Zdrojový kód
│   ├── main.ts             # Hlavní soubor — spouští aplikaci
│   ├── views/              # Stránky (hlavní přehled, data, nastavení)
│   ├── components/panel/   # Komponenty zobrazující data
│   ├── pinia/              # Stavové úložiště (data z backendu)
│   ├── logic/panel/        # Hlavní smyčka dotazování na backend
│   ├── composables/        # Kamera, zvuky, čas
│   └── utils/              # Pomocné funkce
├── public/                 # Statické soubory
│   ├── sounds/             # Zvukové soubory pro alarmy
│   └── config/             # Statická konfigurace
└── dist/                   # Sestavená aplikace (po buildu)
```

## Jak to funguje

1. Panel se pravidelně (každé ~2 sekundy) dotazuje backendu na nová data
2. Data ze senzorů se zobrazují na hlavní obrazovce
3. Při změně stavu (otevření dvířek, teplotní varování) se přehrají zvukové alarmy
4. Nastavení a navigace jsou zamčeny heslem — panel běží bez zásahu

## Spuštění

### Vývoj

#### Windows

```powershell
cd C:\cesta\k\babybox
bun dev:panel
```

#### Ubuntu

```bash
cd /cesta/k/babybox
bun dev:panel
```

Panel bude dostupný na `http://localhost:3002`.

### Produkce

V produkci se panel nestaví samostatně — jeho sestavené soubory servíruje backend. Stačí spustit:

#### Windows

```powershell
cd C:\cesta\k\babybox
bun run build
bun start:main
```

#### Ubuntu

```bash
cd /cesta/k/babybox
bun run build
bun start:main
```

## Konfigurace

Konfigurace panelu se řídí z backendu — hlavní konfigurační soubor je `source/apps/backend/configs/main.json`. Podrobný popis všech nastavení najdete v dokumentaci backendu (`source/apps/backend/CTIME.md`).

### Důležitá nastavení ovlivňující panel

| Klíč v `main.json`   | Popis                                                  |
| -------------------- | ------------------------------------------------------ |
| `babybox.name`       | Název babyboxu zobrazený na panelu                     |
| `units.engine.ip`    | IP řídicí jednotky                                     |
| `units.thermal.ip`   | IP tepelné jednotky                                    |
| `units.requestDelay` | Jak často se obnovují data (ms)                        |
| `camera.ip`          | IP kamery                                              |
| `camera.cameraType`  | Typ kamery (`dahua`, `hikvision`, `avtech`, `vivotek`) |
| `app.password`       | Heslo pro otevření nastavení                           |

### Výpočet napětí

Panel zobrazuje napětí, které se počítá podle vzorce:

```
Napětí = ((Hodnota * multiplier) / divider) + addition
```

Tyto hodnoty se nastavují v `main.json` pod `units.voltage`:

- `divider` — jmenovatel (pro staré SDS: 3400, pro nové SDS: 6300)
- `multiplier` — činitel (typicky 100)
- `addition` — korekce (typicky 0)

## Nejčastější problémy

### Panel se nenačítá

- Zkontrolujte, že backend běží (viz dokumentace backendu)
- Zkontrolujte, že prohlížeč přistupuje na správnou adresu (`http://localhost:3002` při vývoji, nebo `http://localhost:3000` v produkci)

### Nezobrazují se data

- Zkontrolujte, že jsou jednotky babyboxu zapnuté a dostupné na síti
- Zkontrolujte IP adresy v `source/apps/backend/configs/main.json`
- Zkontrolujte logy backendu

### Nehrají se zvuky

- Zkontrolujte, že prohlížeč má povolené přehrávání zvuku (může být zablokováno)
- Zkontrolujte, že jsou zvukové soubory ve složce `public/sounds/`

### Kamera se nezobrazuje

- Zkontrolujte IP adresu a typ kamery v `source/apps/backend/configs/main.json`
- Zkontrolujte přihlašovací údaje kamery
- Ověřte, že je kamera dostupná na síti
