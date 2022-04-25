import type { SettingsTableData, valueType } from "@/types/settings/table";

export const getSettingsHeaders = () => {
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

export const getSettingsTableRows = (): SettingsTableData => {
  return [
    {
      label: "M108",
      name: "Blokování babyboxu",
      recommended: "0/1",
      note: "1 = Babybox mimo provoz",
      type: "string",
    },
    {
      label: "T100",
      name: "Optimální teplota",
      recommended: "28",
      note: "Hodnota hystereze pro vytápění",
      type: "temperature",
    },
    {
      label: "T101",
      name: "Hystereze topení",
      recommended: "1",
      note: "Hodnota hystereze pro chlazení",
      type: "temperature",
    },
    {
      label: "T102",
      name: "Hystereze chlazení",
      recommended: "5",
      note: "Nejnižší povolená vnitřní teplota",
      type: "temperature",
    },
    {
      label: "T103, M106",
      name: "Minimální teplota",
      recommended: "20",
      note: "Nejvyšší povolená vnitřní teplota",
      type: "temperature",
    },
    {
      label: "T104, M107",
      name: "Maximální teplota",
      recommended: "36",
      note: "",
      type: "temperature",
    },
    {
      label: "T105",
      name: "Maximální teplota pláště",
      recommended: "42",
      note: "Hranice pro vypnutí topení pláště",
      type: "temperature",
    },
    {
      label: "T106",
      name: "Kritické napětí akumulátoru",
      recommended: "12",
      note: "",
      type: "voltage",
    },
    {
      label: "T107",
      name: "Mezní teplota klimatizace",
      recommended: "64",
      note: "Nejvyšší přípustná teplota pelt. článků",
      type: "temperature",
    },
    {
      label: "T108, M109",
      name: "Perioda varovných zpráv",
      recommended: "600",
      note: "Perioda zpráv chyby napětí, teplot, ...",
      type: "string",
    },
    {
      label: "M110",
      name: "Perioda kritických zpráv",
      recommended: "60",
      note: "Perioda zpráv aktivace, otevření, kamera",
      type: "string",
    },
    {
      label: "M100",
      name: "Zatížení motorů",
      recommended: "90",
      note: "Citlivost dveří na překážku",
      type: "string",
    },
    {
      label: "M101",
      name: "Čas na rozběh motorů",
      recommended: "70",
      note: "",
      type: "string",
    },
    {
      label: "M102",
      name: "Hranice pro zavření dveří",
      recommended: "20",
      note: "",
      type: "string",
    },
    {
      label: "M103",
      name: "Hranice otevření dveří",
      recommended: "380",
      note: "",
      type: "string",
    },
    {
      label: "M104",
      name: "Doba otevření dveří",
      recommended: "15",
      note: "",
      type: "seconds",
    },
    {
      label: "M112",
      name: "Urychlení zavření",
      recommended: "2",
      note: "Čas zavírání po uvolnění závory",
      type: "seconds",
    },
    {
      label: "M105",
      name: "Perioda kontroly spojení",
      recommended: "120",
      note: "Dojde k blokaci pro chybu spojení s PC",
      type: "seconds",
    },
    {
      label: "M111",
      name: "Perioda zkoušek",
      recommended: "7",
      note: "Doporučená perioda zkoušek",
      type: "days",
    },
  ];
};

export const typeToMeasureUnit = (type: valueType) => {
  if (type === "string") return "";
  if (type === "temperature") return "°C";
  if (type === "voltage") return "V";
  if (type === "seconds") return "s";
  if (type === "days") return "den";
};

export const settingsRowMapper = (data: SettingsTableData) => {
  return data.map((data) => {
    return {
      label: data.label,
      name: data.name,
      engine: data.label.includes("M") ? "" : "—",
      thermal: data.label.includes("T") ? "" : "—",
      recommended: data.recommended + typeToMeasureUnit(data.type),
      note: data.note,
      type: data.type,
    };
  });
};
