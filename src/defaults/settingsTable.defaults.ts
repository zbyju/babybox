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
      label: "M108",
      name: "Blokování babyboxu",
      recommended: "0/1",
      note: "1 = Babybox mimo provoz",
      type: SettingsTableRowValueType.String,
    },
    {
      label: "T100",
      name: "Optimální teplota",
      recommended: "28",
      note: "Hodnota hystereze pro vytápění",
      type: SettingsTableRowValueType.Temperature,
    },
    {
      label: "T101",
      name: "Hystereze topení",
      recommended: "1",
      note: "Hodnota hystereze pro chlazení",
      type: SettingsTableRowValueType.Temperature,
    },
    {
      label: "T102",
      name: "Hystereze chlazení",
      recommended: "5",
      note: "Nejnižší povolená vnitřní teplota",
      type: SettingsTableRowValueType.Temperature,
    },
    {
      label: "T103, M106",
      name: "Minimální teplota",
      recommended: "20",
      note: "Nejvyšší povolená vnitřní teplota",
      type: SettingsTableRowValueType.Temperature,
    },
    {
      label: "T104, M107",
      name: "Maximální teplota",
      recommended: "36",
      note: "",
      type: SettingsTableRowValueType.Temperature,
    },
    {
      label: "T105",
      name: "Maximální teplota pláště",
      recommended: "42",
      note: "Hranice pro vypnutí topení pláště",
      type: SettingsTableRowValueType.Temperature,
    },
    {
      label: "T106",
      name: "Kritické napětí akumulátoru",
      recommended: "12",
      note: "",
      type: SettingsTableRowValueType.Voltage,
    },
    {
      label: "T107",
      name: "Mezní teplota klimatizace",
      recommended: "64",
      note: "Nejvyšší přípustná teplota pelt. článků",
      type: SettingsTableRowValueType.Temperature,
    },
    {
      label: "T108, M109",
      name: "Perioda varovných zpráv",
      recommended: "600",
      note: "Perioda zpráv chyby napětí, teplot, ...",
      type: SettingsTableRowValueType.String,
    },
    {
      label: "M110",
      name: "Perioda kritických zpráv",
      recommended: "60",
      note: "Perioda zpráv aktivace, otevření, kamera",
      type: SettingsTableRowValueType.String,
    },
    {
      label: "M100",
      name: "Zatížení motorů",
      recommended: "90",
      note: "Citlivost dveří na překážku",
      type: SettingsTableRowValueType.String,
    },
    {
      label: "M101",
      name: "Čas na rozběh motorů",
      recommended: "70",
      note: "",
      type: SettingsTableRowValueType.String,
    },
    {
      label: "M102",
      name: "Hranice pro zavření dveří",
      recommended: "20",
      note: "",
      type: SettingsTableRowValueType.String,
    },
    {
      label: "M103",
      name: "Hranice otevření dveří",
      recommended: "380",
      note: "",
      type: SettingsTableRowValueType.String,
    },
    {
      label: "M104",
      name: "Doba otevření dveří",
      recommended: "15",
      note: "",
      type: SettingsTableRowValueType.Seconds,
    },
    {
      label: "M112",
      name: "Urychlení zavření",
      recommended: "2",
      note: "Čas zavírání po uvolnění závory",
      type: SettingsTableRowValueType.Seconds,
    },
    {
      label: "M105",
      name: "Perioda kontroly spojení",
      recommended: "120",
      note: "Dojde k blokaci pro chybu spojení s PC",
      type: SettingsTableRowValueType.Seconds,
    },
    {
      label: "M111",
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
  return template.map((t: SettingsTableRowTemplate): SettingsTableRowValue => {
    const engine: string = t.label.includes("M") ? "" : "—";
    const thermal: string = t.label.includes("T") ? "" : "—";

    return {
      engine: engine,
      thermal: thermal,
      value: "",
      state: SettingsTableRowState.Neutral,
    };
  });
};
