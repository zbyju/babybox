export type UnitVariable = {
  index: number;
  value: string;
  label?: string;
};

export type EngineUnit = Array<UnitVariable>;
export type ThermalUnit = Array<UnitVariable>;

export const DefaultThermalUnit = [
  {
    index: 0,
    label: "Optimální teplota",
    value: "",
  },
  {
    index: 1,
    label: "Hystereze topení",
    value: "",
  },
  {
    index: 2,
    label: "Hystereze chlazení",
    value: "",
  },
  {
    index: 3,
    label: "Minimální teplota",
    value: "",
  },
  {
    index: 4,
    label: "Maximální teplota",
    value: "",
  },
  {
    index: 5,
    label: "Max.teplota pláště",
    value: "",
  },
  {
    index: 6,
    label: "Minimální napětí",
    value: "",
  },
  {
    index: 7,
    label: "Max.teplota Pelt.",
    value: "",
  },
  {
    index: 8,
    label: "Perioda e-mail zpráv",
    value: "",
  },
  {
    index: 9,
    label: "",
    value: "",
  },
  {
    index: 10,
    label: "",
    value: "",
  },
  {
    index: 11,
    label: "",
    value: "",
  },
  {
    index: 12,
    label: "",
    value: "",
  },
  {
    index: 13,
    label: "",
    value: "",
  },
  {
    index: 14,
    label: "",
    value: "",
  },
  {
    index: 15,
    label: "",
    value: "",
  },
  {
    index: 16,
    label: "Světlo/",
    value: "",
  },
  {
    index: 17,
    label: "Závora/",
    value: "",
  },
  {
    index: 18,
    label: "",
    value: "",
  },
  {
    index: 19,
    label: "",
    value: "",
  },
  {
    index: 20,
    label: "Tlačítko/",
    value: "",
  },
  {
    index: 21,
    label: "",
    value: "",
  },
  {
    index: 22,
    label: "Vanička/",
    value: "",
  },
  {
    index: 23,
    label: "Servisní dveře/",
    value: "",
  },
  {
    index: 24,
    label: "Topení pláště",
    value: "",
  },
  {
    index: 25,
    label: "Topení Pelt.",
    value: "",
  },
  {
    index: 26,
    label: "Chlazení",
    value: "",
  },
  {
    index: 27,
    label: "Dolní ventilátor",
    value: "",
  },
  {
    index: 28,
    label: "Vnější teplota",
    value: "",
  },
  {
    index: 29,
    label: "Vnitřní teplota",
    value: "",
  },
  {
    index: 30,
    label: "Teplota pláště",
    value: "",
  },
  {
    index: 31,
    label: "Teplota dolní pelt.",
    value: "",
  },
  {
    index: 32,
    label: "Teplota horní pelt.",
    value: "",
  },
  {
    index: 33,
    label: "",
    value: "",
  },
  {
    index: 34,
    label: "",
    value: "",
  },
  {
    index: 35,
    label: "Vstupní napětí",
    value: "",
  },
  {
    index: 36,
    label: "Napětí Aku",
    value: "",
  },
  {
    index: 37,
    label: "Provozní napětí",
    value: "",
  },
  {
    index: 38,
    label: "Pom.napětí 12V",
    value: "",
  },
  {
    index: 39,
    label: "Den",
    value: "",
  },
  {
    index: 40,
    label: "Měsíc",
    value: "",
  },
  {
    index: 41,
    label: "Rok",
    value: "",
  },
  {
    index: 42,
    label: "Hodina",
    value: "",
  },
  {
    index: 43,
    label: "Minuta",
    value: "",
  },
  {
    index: 44,
    label: "Sekunda",
    value: "",
  },
  {
    index: 45,
    label: "Status",
    value: "",
  },
  {
    index: 46,
    label: "Blokace",
    value: "",
  },
  {
    index: 47,
    label: "Fronta e-mail zpráv",
    value: "",
  },
  {
    index: 48,
    label: "",
    value: "",
  },
  {
    index: 49,
    label: "",
    value: "",
  },
  {
    index: 50,
    label: "Časovač chyby napětí",
    value: "",
  },
  {
    index: 51,
    label: "Časovač chyby Akumulátoru",
    value: "",
  },
  {
    index: 52,
    label: "Časovač chyby teploty",
    value: "",
  },
  {
    index: 53,
    label: "",
    value: "",
  },
  {
    index: 54,
    label: "",
    value: "",
  },
  {
    index: 55,
    label: "",
    value: "",
  },
  {
    index: 56,
    label: "",
    value: "",
  },
  {
    index: 57,
    label: "",
    value: "",
  },
  {
    index: 58,
    label: "",
    value: "",
  },
  {
    index: 59,
    label: "",
    value: "",
  },
];

export const DefaultEngineUnit = [
  {
    index: 0,
    label: "Dovolená zátěž motorů",
    value: "",
  },
  {
    index: 1,
    label: "Čas pro rozběh motorů",
    value: "",
  },
  {
    index: 2,
    label: "Hranice dveří pro Zavřeno",
    value: "",
  },
  {
    index: 3,
    label: "Hranice dveří pro Otevřeno",
    value: "",
  },
  {
    index: 4,
    label: "Doba otevření dveří",
    value: "",
  },
  {
    index: 5,
    label: "Timeout pro spojení s PC",
    value: "",
  },
  {
    index: 6,
    label: "Minimální teplota",
    value: "",
  },
  {
    index: 7,
    label: "Maximální teplota",
    value: "",
  },
  {
    index: 8,
    label: "Babybox Mimo provoz",
    value: "",
  },
  {
    index: 9,
    label: "Perioda zpráv",
    value: "",
  },
  {
    index: 10,
    label: "Perioda kritických zpráv",
    value: "",
  },
  {
    index: 11,
    label: "Perioda zkoušek",
    value: "",
  },
  {
    index: 12,
    label: "Čas zavírání po uvolnění závory",
    value: "",
  },
  {
    index: 13,
    label: "",
    value: "",
  },
  {
    index: 14,
    label: "",
    value: "",
  },
  {
    index: 15,
    label: "",
    value: "",
  },
  {
    index: 16,
    label: "Blokace z jedn.topení/",
    value: "",
  },
  {
    index: 17,
    label: "Závora/",
    value: "",
  },
  {
    index: 18,
    label: "/",
    value: "",
  },
  {
    index: 19,
    label: "/",
    value: "",
  },
  {
    index: 20,
    label: "Tlačítko/",
    value: "",
  },
  {
    index: 21,
    label: "",
    value: "",
  },
  {
    index: 22,
    label: "Vanička/",
    value: "",
  },
  {
    index: 23,
    label: "Servisní dveře/",
    value: "",
  },
  {
    index: 24,
    label: "Levý motor",
    value: "",
  },
  {
    index: 25,
    label: "Pravý motor",
    value: "",
  },
  {
    index: 26,
    label: "Směr motorů",
    value: "",
  },
  {
    index: 27,
    label: "Světlo-Blokace/",
    value: "",
  },
  {
    index: 28,
    label: "Teplota",
    value: "",
  },
  {
    index: 29,
    label: "Počet chyb dveří",
    value: "",
  },
  {
    index: 30,
    label: "",
    value: "",
  },
  {
    index: 31,
    label: "",
    value: "",
  },
  {
    index: 32,
    label: "Fronta e-mail zpráv",
    value: "",
  },
  {
    index: 33,
    label: "Dnů od zkoušky-aktivace",
    value: "",
  },
  {
    index: 34,
    label: "",
    value: "",
  },
  {
    index: 35,
    label: "Levý motor zátěž",
    value: "",
  },
  {
    index: 36,
    label: "Pravý motor zátěž",
    value: "",
  },
  {
    index: 37,
    label: "Levý motor poloha",
    value: "",
  },
  {
    index: 38,
    label: "Pravý motor poloha",
    value: "",
  },
  {
    index: 39,
    label: "Dden",
    value: "",
  },
  {
    index: 40,
    label: "Měsíc",
    value: "",
  },
  {
    index: 41,
    label: "Rok",
    value: "",
  },
  {
    index: 42,
    label: "Hodina",
    value: "",
  },
  {
    index: 43,
    label: "Minuta",
    value: "",
  },
  {
    index: 44,
    label: "Sekunda",
    value: "",
  },
  {
    index: 45,
    label: "Blokováno",
    value: "",
  },
  {
    index: 46,
    label: "Levý m.max.zátěž",
    value: "",
  },
  {
    index: 47,
    label: "Pravý m.max. zátež",
    value: "",
  },
  {
    index: 48,
    label: "Stav dvířek",
    value: "",
  },
  {
    index: 49,
    label: "Časovač Timeout spojení s PC",
    value: "",
  },
  {
    index: 50,
    label: "Časovač zprávy Otevřeno",
    value: "",
  },
  {
    index: 51,
    label: "Časovač cyklu dveří",
    value: "",
  },
  {
    index: 52,
    label: "Časovač zprávy Timeout spojení",
    value: "",
  },
  {
    index: 53,
    label: "Časovač zprávy Aktivace",
    value: "",
  },
  {
    index: 54,
    label: "Časovač zprávy Otevření",
    value: "",
  },
  {
    index: 55,
    label: "Časovač při překážce",
    value: "",
  },
  {
    index: 56,
    label: "Časovač zprávy o teplotě",
    value: "",
  },
  {
    index: 57,
    label: "Časovač impulsu pro kameru",
    value: "",
  },
  {
    index: 58,
    label: "Časovač zprávy o servisních dveřích",
    value: "",
  },
  {
    index: 59,
    label: "Časovač od zkoušky-aktivace",
    value: "",
  },
];
