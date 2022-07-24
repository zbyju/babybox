import {
  type SettingsTableRowTemplate,
  type SettingsTableRowValue,
  SettingsTableRowState,
  SettingsTableRowValueType,
} from "@/types/settings/table.types";

export const getSettingsTableHeaders = () => {
  return [
    "#",
    "Název parametru",
    "Jednotka motory",
    "Jednotka topení",
    "Nová hodnota",
    "Doporučená hodnota",
    "Poznámka",
  ];
};

export const getSettingsTableTemplateRows = (): SettingsTableRowTemplate[] => {
  return [
    {
      engine: 108,
      thermal: null,
      name: "Blokování babyboxu",
      recommended: "0",
      note: "1 = Babybox mimo provoz",
      type: SettingsTableRowValueType.String,
    },
    {
      engine: null,
      thermal: 100,
      name: "Optimální teplota",
      recommended: "28",
      note: "Hodnota hystereze pro vytápění",
      type: SettingsTableRowValueType.Temperature,
    },
    {
      engine: null,
      thermal: 101,
      name: "Hystereze topení",
      recommended: "1",
      note: "Hodnota hystereze pro chlazení",
      type: SettingsTableRowValueType.Temperature,
    },
    {
      engine: null,
      thermal: 102,
      name: "Hystereze chlazení",
      recommended: "5",
      note: "Nejnižší povolená vnitřní teplota",
      type: SettingsTableRowValueType.Temperature,
    },
    {
      engine: 106,
      thermal: 103,
      name: "Minimální teplota",
      recommended: "20",
      note: "Nejvyšší povolená vnitřní teplota",
      type: SettingsTableRowValueType.Temperature,
    },
    {
      engine: 107,
      thermal: 104,
      name: "Maximální teplota",
      recommended: "36",
      note: "",
      type: SettingsTableRowValueType.Temperature,
    },
    {
      engine: null,
      thermal: 105,
      name: "Maximální teplota pláště",
      recommended: "42",
      note: "Hranice pro vypnutí topení pláště",
      type: SettingsTableRowValueType.Temperature,
    },
    {
      engine: null,
      thermal: 106,
      name: "Kritické napětí akumulátoru",
      recommended: "12",
      note: "",
      type: SettingsTableRowValueType.Voltage,
    },
    {
      engine: null,
      thermal: 107,
      name: "Mezní teplota klimatizace",
      recommended: "64",
      note: "Nejvyšší přípustná teplota pelt. článků",
      type: SettingsTableRowValueType.Temperature,
    },
    {
      engine: 109,
      thermal: 108,
      name: "Perioda varovných zpráv",
      recommended: "600",
      note: "Perioda zpráv chyby napětí, teplot, ...",
      type: SettingsTableRowValueType.String,
    },
    {
      engine: 110,
      thermal: null,
      name: "Perioda kritických zpráv",
      recommended: "60",
      note: "Perioda zpráv aktivace, otevření, kamera",
      type: SettingsTableRowValueType.String,
    },
    {
      engine: 100,
      thermal: null,
      name: "Zatížení motorů",
      recommended: "90",
      note: "Citlivost dveří na překážku",
      type: SettingsTableRowValueType.String,
    },
    {
      engine: 101,
      thermal: null,
      name: "Čas na rozběh motorů",
      recommended: "70",
      note: "",
      type: SettingsTableRowValueType.String,
    },
    {
      engine: 102,
      thermal: null,
      name: "Hranice pro zavření dveří",
      recommended: "20",
      note: "",
      type: SettingsTableRowValueType.String,
    },
    {
      engine: 103,
      thermal: null,
      name: "Hranice otevření dveří",
      recommended: "380",
      note: "",
      type: SettingsTableRowValueType.String,
    },
    {
      engine: 104,
      thermal: null,
      name: "Doba otevření dveří",
      recommended: "15",
      note: "",
      type: SettingsTableRowValueType.Seconds,
    },
    {
      engine: 112,
      thermal: null,
      name: "Urychlení zavření",
      recommended: "2",
      note: "Čas zavírání po uvolnění závory",
      type: SettingsTableRowValueType.Seconds,
    },
    {
      engine: 105,
      thermal: null,
      name: "Perioda kontroly spojení",
      recommended: "120",
      note: "Dojde k blokaci pro chybu spojení s PC",
      type: SettingsTableRowValueType.Seconds,
    },
    {
      engine: 111,
      thermal: null,
      name: "Perioda zkoušek",
      recommended: "7",
      note: "Doporučená perioda zkoušek",
      type: SettingsTableRowValueType.Days,
    },
  ];
};

export const getSettingsTableValues = (
  template: SettingsTableRowTemplate[],
): SettingsTableRowValue[] => {
  return template.map(
    (t: SettingsTableRowTemplate): SettingsTableRowValue => ({
      engine: t.engine ? "" : "—",
      thermal: t.thermal ? "" : "—",
      value: "",
      state: SettingsTableRowState.Neutral,
    }),
  );
};
