import store from "@/store";
import { Connection } from "@/types/panel/connection";
import { TableBlockData, TableData } from "@/types/panel/tables";
import { EngineUnit, ThermalUnit } from "@/types/panel/units-data";
import {
  beamAboveContainer,
  prettyInt,
  prettyBooleanString,
  prettyTemperature,
  prettyTwoNumbers,
  prettyTwoPercentages,
  prettyTwoTemperatures,
  prettyVoltage,
  secondsToTime,
  parseBoolean,
  errorInnerTemperature,
  errorVoltageBattery,
  errorVoltageIn,
  errorVoltageUnits,
  errorVoltageGSM,
} from "./data";

export const getRowsTableTemperatures = (
  engineData: EngineUnit,
  thermalData: ThermalUnit
): TableData => {
  return [
    {
      label: "Cílová teplota 1|2",
      value: prettyTemperature(thermalData[0].value),
    },
    {
      label: "Vnitřní teplota",
      value: prettyTwoTemperatures(thermalData[29].value, engineData[28].value),
      error: errorInnerTemperature(engineData, thermalData),
    },
    {
      label: "Venkovní teplota",
      value: prettyTemperature(thermalData[28].value),
    },
    {
      label: "Vnitřní výměník vzduch",
      value: prettyTemperature(thermalData[31].value),
    },
    {
      label: "Venkovní výměník vzduch",
      value: prettyTemperature(thermalData[32].value),
    },
    {
      label: "Vnitřní plášť teplota",
      value: prettyTemperature(thermalData[30].value),
    },
  ];
};

export const getBlocksTableTemperature = (
  engineData: EngineUnit,
  thermalData: ThermalUnit
): TableBlockData => {
  return [
    [
      {
        label: "Topí plášť",
        active: thermalData[24].value === "255",
        colspan: 2,
        color: "success",
      },
      {
        label: "Topí vzduch",
        active: thermalData[25].value === "255",
        colspan: 2,
        color: "success",
      },
      {
        label: "Chladí vzduch",
        active: thermalData[26].value === "255",
        colspan: 2,
        color: "success",
      },
    ],
  ];
};

export const getRowsVoltage = (
  engineData: EngineUnit,
  thermalData: ThermalUnit
): TableData => {
  return [
    {
      label: "Zdroj",
      value: prettyVoltage(thermalData[35].value),
      error: errorVoltageIn(engineData, thermalData),
    },
    {
      label: "Akumulátor",
      value: prettyVoltage(thermalData[36].value),
      error: errorVoltageBattery(engineData, thermalData),
    },
    {
      label: "Řídící jednotky",
      value: prettyVoltage(thermalData[37].value),
      error: errorVoltageUnits(engineData, thermalData),
    },
    {
      label: "GSM Komunikátor",
      value: prettyVoltage(thermalData[38].value),
      error: errorVoltageGSM(engineData, thermalData),
    },
    {
      label: "Zdroj cíl",
      value: "14-15V",
    },
    {
      label: "Akumulátor cíl",
      value: "12,8-14V",
    },
    {
      label: "Řídící jednotky cíl",
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
      value: engineData[37].value,
    },
    {
      label: "Levé zátěž",
      value: engineData[46].value,
    },
    {
      label: "Pravé poloha",
      value: engineData[38].value,
    },
    {
      label: "Pravé zátěž",
      value: engineData[47].value,
    },
    {
      label: "Paprsek nad vaničkou",
      value: beamAboveContainer(engineData[17].value),
    },
  ];
};

export const getBlocksTableDoors = (
  engineData: EngineUnit,
  thermalData: ThermalUnit
): TableBlockData => {
  return [
    [
      {
        label: "Blokováno",
        nonActiveLabel: "Neblokováno",
        active: parseBoolean(engineData[45].value),
        colspan: 6,
        color: "error",
      },
    ],
  ];
};

export const getRowsTableConnection = (
  engineData: EngineUnit,
  thermalData: ThermalUnit,
  connection: Connection
): TableData => {
  // console.log(engineData[59].value, "Casovac od zkousky-aktivace");
  // console.log(engineData[11].value, "perioda zkousek");
  // console.log(engineData[33].value, "Dnu od zkousky-aktivace");
  return [
    {
      label: "PC dotaz",
      value: prettyTwoNumbers(
        connection.engineUnit.requests,
        connection.thermalUnit.requests
      ),
    },
    {
      label: "BB odpověď",
      value: prettyTwoNumbers(
        connection.engineUnit.successes,
        connection.thermalUnit.successes
      ),
    },
    {
      label: "Ztracené odpovědi",
      value: prettyTwoNumbers(
        connection.engineUnit.fails,
        connection.thermalUnit.fails
      ),
    },
    {
      label: "Kvalita spojení",
      value: prettyTwoPercentages(
        connection.engineUnit.getQuality(),
        connection.thermalUnit.getQuality()
      ),
    },
    {
      label: "Limit spojení",
      value: store.state.config.units.requestTimeout + "ms",
    },
    {
      label: "Čas do zkoušky",
      value: secondsToTime(engineData[59].value),
    },
  ];
};
