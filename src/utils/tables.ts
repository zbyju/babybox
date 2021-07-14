import { TableData } from "@/types/tables";
import { EngineUnit, ThermalUnit } from "@/types/units-data";
import { prettyTemperature } from "./data";

export const getRowsTableTemperatures = (
  engineData: EngineUnit,
  thermalData: ThermalUnit
): TableData => {
  return [
    {
      label: "Vnitřní",
      value: `${prettyTemperature(thermalData[29].value)} | ${prettyTemperature(
        thermalData[29].value
      )}`,
    },
    {
      label: "Cílová teplota",
      value: prettyTemperature(thermalData[28].value),
    },
    {
      label: "Venkovní",
      value: prettyTemperature(thermalData[28].value),
    },
    {
      label: "Dolní",
      value: prettyTemperature(thermalData[31].value),
    },
    {
      label: "Horní",
      value: prettyTemperature(thermalData[32].value),
    },
    {
      label: "Plášť",
      value: prettyTemperature(thermalData[30].value),
    },
  ];
};

export const getRowsACState = (
  engineData: EngineUnit,
  thermalData: ThermalUnit
): TableData => {
  return [
    {
      label: "Topí plášť",
      value: prettyTemperature(thermalData[29].value),
    },
    {
      label: "Topí vzduch",
      value: prettyTemperature(thermalData[29].value),
    },
    {
      label: "Chladí vzduch",
      value: prettyTemperature(thermalData[29].value),
    },
    {
      label: "Cílová teplota",
      value: prettyTemperature(thermalData[29].value),
    },
    {
      label: "Hysterze topení",
      value: prettyTemperature(thermalData[29].value),
    },
    {
      label: "Hysterze chlazení",
      value: prettyTemperature(thermalData[29].value),
    },
  ];
};

export const getRowsVoltage = (
  engineData: EngineUnit,
  thermalData: ThermalUnit
): TableData => {
  return [
    {
      label: "Zdroj",
      value: prettyTemperature(thermalData[29].value),
    },
    {
      label: "Akumulátor",
      value: prettyTemperature(thermalData[29].value),
    },
    {
      label: "Řídící jednotky",
      value: prettyTemperature(thermalData[29].value),
    },
    {
      label: "GSM Komunikátor",
      value: prettyTemperature(thermalData[29].value),
    },
    {
      label: "Zdroj",
      value: "14-15V",
    },
    {
      label: "Akumulátor",
      value: "12,8-14V",
    },
    {
      label: "Řídící jednotky",
      value: "12,1-13V",
    },
  ];
};

export const getRowsTableDoors = (
  engineData: EngineUnit,
  thermalData: ThermalUnit
): TableData => {
  return [
    {
      label: "Levé poloha",
      value: thermalData[29].value,
    },
    {
      label: "Levé zátěž",
      value: thermalData[28].value,
    },
    {
      label: "Pravé poloha",
      value: thermalData[31].value,
    },
    {
      label: "Pravé zátěž",
      value: thermalData[32].value,
    },
    {
      label: "Paprsek nad vaničkou",
      value: thermalData[30].value,
    },
    {
      label: "Blokováno",
      value: thermalData[30].value,
    },
  ];
};

export const getRowsTableConnection = (
  engineData: EngineUnit,
  thermalData: ThermalUnit
): TableData => {
  return [
    {
      label: "PC dotaz",
      value: thermalData[29].value,
    },
    {
      label: "BB odpověď",
      value: thermalData[28].value,
    },
    {
      label: "Ztracené odpovědi",
      value: thermalData[31].value,
    },
    {
      label: "Kvalita spojení",
      value: thermalData[32].value,
    },
    {
      label: "Limit spojení",
      value: thermalData[30].value,
    },
    {
      label: "Dnů do zkoušky",
      value: thermalData[30].value,
    },
  ];
};