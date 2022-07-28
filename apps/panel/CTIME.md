# Babybox Panel

## Config

Pro nastavení panelu je potřeba vytvořit config soubor, který je umístěný v `/public/config`. Stačí zkopírovat soubor `config.template.json` a zkopírovaný soubor pojmenovat `config.json`. Tento soubor by měl obsahovat základní nastavení.

### Vysvětlení jednotlivých hodnot

```typescript
// string = řetězec = text; zapisováno v "" (příklad: "Ahoj, tohle je řetězec")
// number = číslo; zapisováno jako číslo (příklad: 42)
// boolean = true/false = pravda/nepravda = ano/ne; zapisováno jako true nebo false (příklad: true)
{
  "babybox": {
    // Název babyboxu
    "name": string,
    // Má být před názvem babyboxu napsáno Babybox
    "prependBabyboxBeforeName": boolean
  },
  // Nastavení jednotek
  "units": {
    // Motorová
    "engine": {
      // IP Adresa motorové jednotky
      "ip": string
    },
    // Topení
    "thermal": {
      // IP Adresa jednotky topení
      "ip": string
    },
    // URL adresa za IP adresou pro získání dat (http://IP/postfix) - pro SDS nastavit jako: "/get_ram[0]?rn=60"
    "postfix": string,
    // URL adresa za IP adresou pro obnovení Watchdogu babyboxu (obnovení časovače pro zablokování babyboxu, při ztrátě spojení s PC) = pro SDS nastavit jako: "postfixWatchdog": "/sdscep?sys141=115"
    "postfixWatchdog": string,
    // Rychlost posílání požadavků v ms
    "requestDelay": number,
    // Doba vyprčení požadavku v ms
    "requestTimeout": number,
    // Počet chyb pro vyvolání varování spojení
    "warningThreshold": number,
    // Počet chyb pro vyvolání chyby spojení
    "errorThreshold": number,
    // Výpočet napětí - rovnice: Napětí = ((Hodnota * multiplier) / divider) + addition
    "voltage": {
      // Jmenovatel - pro staré SDS = 3400; pro nové SDS 6300
      "divider": number,
      // Činitel - typicky 100
      "multiplier": number,
      // Dodatečná korekce +-číslo; typicky 0
      "addition": number
    }
  },
  // Nastavení kamery
  "camera": {
    // IP adresa kamery
    "ip": string,
    // Přihlašovací jméno
    "username": string,
    // Heslo
    "password": string,
    // Rychlost refreshování snímků v ms
    "updateDelay": number,
    // Typ kamery - povolené hodnoty: "dahua", "avtech"
    "cameraType": string
  },
  // Nastavení aplikace
  "app": {
    // Heslo pro otevření navigace/menu
    "password": "test",
  }
}
```

Dále lze v souboru `styles.json` nastavit styly zobrazení. To může být užitečné, pokud někde text přetýká, je moc malý apod. Obecně tohle ale není potřeba měnit.

## Příkazy

Před použitím aplikace je potřeba nainstalovat: [Node.js](https://nodejs.org/en/) (stačí LTS verze; Windows 7 podporuje jen verzi 12).

Pak je potřeba nainstalovat **pnpm** - `npm install -g pnpm`.

### Nainstalování závislostí aplikace

`pnpm install`

### Spuštění projektu v developerském režimu

`pnpm dev`

### Zbuildění projektu (kompilace) do proudkčního kódu

`pnpm build`
