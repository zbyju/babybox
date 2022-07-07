import { useConfigStore } from "@/pinia/configStore";
import type { Maybe } from "@/types/generic.types";
import type { Connection } from "@/types/panel/connection.types";
import type { TableBlockData, TableData } from "@/types/panel/tables.types";
import type { EngineUnit, ThermalUnit } from "@/types/panel/units.types";
import { storeToRefs } from "pinia";
import {
  displayCustomBoolean,
  displayPercentage,
  displayTemperature,
  displayTwoItems,
  displayVoltage,
  isHigher,
  isLower,
  prettyNumber,
  secondsToTime,
} from "./dataDisplay";

export const getRowsTableTemperatures = (
  engineData: Maybe<EngineUnit>,
  thermalData: Maybe<ThermalUnit>,
): TableData => {
  return [
    {
      label: "Cílová teplota",
      value: displayTemperature(
        thermalData?.settings.temperature.optimalInner,
        "Error",
      ),
    },
    {
      label: "Vnitřní teplota",
      value: displayTemperature(thermalData?.data.temperature.inner, "Error"),
    },
    {
      label: "Venkovní teplota",
      value: displayTemperature(thermalData?.data.temperature.outside, "Error"),
    },
    {
      label: "Vnitřní výměník vzduch",
      value: displayTemperature(thermalData?.data.temperature.bottom, "Error"),
    },
    {
      label: "Venkovní výměník vzduch",
      value: displayTemperature(thermalData?.data.temperature.top, "Error"),
    },
    {
      label: "Vnitřní plášť",
      value: displayTemperature(thermalData?.data.temperature.casing, "Error"),
    },
  ];
};

export const getBlocksTableTemperature = (
  engineData: Maybe<EngineUnit>,
  thermalData: Maybe<ThermalUnit>,
): TableBlockData => {
  return [
    [
      {
        label: "Topí plášť",
        active: thermalData?.data.temperature.isHeatingCasing === true,
        colspan: 2,
        color: "color-success",
      },
      {
        label: "Topí vzduch",
        active: thermalData?.data.temperature.isHeatingAir === true,
        colspan: 2,
        color: "color-success",
      },
      {
        label: "Chladí vzduch",
        active: thermalData?.data.temperature.isCoolingAir === true,
        colspan: 2,
        color: "color-success",
      },
    ],
  ];
};

export const getRowsVoltage = (
  engineData: Maybe<EngineUnit>,
  thermalData: Maybe<ThermalUnit>,
): TableData => {
  return [
    {
      label: "Zdroj",
      value: displayVoltage(thermalData?.data.voltage.in, "Error"),
      error: isLower(
        thermalData?.data.voltage.in,
        thermalData?.settings.voltage.minimal,
      ),
    },
    {
      label: "Akumulátor",
      value: displayVoltage(thermalData?.data.voltage.battery, "Error"),
      error: isLower(
        thermalData?.data.voltage.battery,
        thermalData?.settings.voltage.minimal,
      ),
    },
    {
      label: "Řídící jednotky",
      value: displayVoltage(thermalData?.data.voltage.units, "Error"),
      error: isLower(
        thermalData?.data.voltage.units,
        thermalData?.settings.voltage.minimal,
      ),
    },
    {
      label: "GSM Komunikátor",
      value: displayVoltage(thermalData?.data.voltage.gsm, "Error"),
      error: isLower(
        thermalData?.data.voltage.gsm,
        thermalData?.settings.voltage.minimal,
      ),
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
  engineData: Maybe<EngineUnit>,
  _: Maybe<ThermalUnit>,
): TableData => {
  return [
    {
      label: "Levé poloha",
      value: displayVoltage(engineData?.data.engine.left.position, "Error"),
    },
    {
      label: "Pravé poloha",
      value: displayVoltage(engineData?.data.engine.right.position, "Error"),
    },
    {
      label: "Levé zátěž",
      value: displayVoltage(engineData?.data.engine.left.load, "Error"),
    },
    {
      label: "Pravé zátěž",
      value: displayVoltage(engineData?.data.engine.right.load, "Error"),
    },
    {
      label: "Paprsek nad vaničkou",
      value: displayCustomBoolean(
        engineData?.data.door.isBarrierInterrupted,
        "Překážka",
        "Volno",
        "Error",
      ),
    },
  ];
};

export const getBlocksTableDoors = (
  engineData: Maybe<EngineUnit>,
  _: Maybe<ThermalUnit>,
): TableBlockData => {
  return [
    [
      {
        label: "Blokováno",
        nonActiveLabel: "Neblokováno",
        active: engineData?.data.isBlocked === true,
        colspan: 6,
        color: "color-error",
      },
    ],
  ];
};

export const getRowsTableConnection = (
  engineData: Maybe<EngineUnit>,
  _: Maybe<ThermalUnit>,
  connection: Connection,
): TableData => {
  const configStore = useConfigStore();
  const { units } = storeToRefs(configStore);
  return [
    {
      label: "PC dotaz",
      value: displayTwoItems(
        connection.engineUnit.requests,
        connection.thermalUnit.requests,
        prettyNumber,
        "Error",
      ),
    },
    {
      label: "BB odpověď",
      value: displayTwoItems(
        connection.engineUnit.successes,
        connection.thermalUnit.successes,
        prettyNumber,
        "Error",
      ),
    },
    {
      label: "Ztracené odpovědi",
      value: displayTwoItems(
        connection.engineUnit.fails,
        connection.thermalUnit.fails,
        prettyNumber,
        "Error",
      ),
    },
    {
      label: "Kvalita spojení",
      value: displayTwoItems(
        connection.engineUnit.getQuality(),
        connection.thermalUnit.getQuality(),
        displayPercentage,
        "Error",
      ),
    },
    {
      label: "Limit spojení",
      value: units.value.requestTimeout + "ms",
    },
    {
      label: "Čas do zkoušky",
      value: secondsToTime(engineData?.data.timers.inspectionMessage, "Error"),
    },
  ];
};
