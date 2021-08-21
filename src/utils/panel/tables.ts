import store from "@/store";
import { Connection } from "@/types/panel/connection";
import { TableData } from "@/types/panel/tables";
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
} from "./data";

export const getRowsTableTemperatures = (
  engineData: EngineUnit,
  thermalData: ThermalUnit
): TableData => {
  return [
    {
      label: "Cílová teplota",
      value: prettyTemperature(thermalData[0].value),
    },
    {
      label: "Vnitřní",
      value: prettyTwoTemperatures(thermalData[29].value, engineData[28].value),
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

export const getRowsVoltage = (
  engineData: EngineUnit,
  thermalData: ThermalUnit
): TableData => {
  return [
    {
      label: "Zdroj",
      value: prettyVoltage(thermalData[35].value),
    },
    {
      label: "Akumulátor",
      value: prettyVoltage(thermalData[36].value),
    },
    {
      label: "Řídící jednotky",
      value: prettyVoltage(thermalData[37].value),
    },
    {
      label: "GSM Komunikátor",
      value: prettyVoltage(thermalData[38].value),
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
    {
      label: "Blokováno",
      value: prettyBooleanString(engineData[45].value),
    },
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
