import { TableData } from "@/types/tables";
import { EngineUnit, ThermalUnit } from "@/types/units-data";

export const getRowsTableTemperatures = (
  engineData: EngineUnit,
  thermalData: ThermalUnit
): TableData => {
  return [
    {
      label: "Teplota vnitrni",
      value: thermalData[29].value,
    },
    {
      label: "Teplota venkovni",
      value: thermalData[28].value,
    },
    {
      label: "Teplota dolni",
      value: thermalData[31].value,
    },
    {
      label: "Teplota horni",
      value: thermalData[32].value,
    },
    {
      label: "Teplota plast",
      value: thermalData[30].value,
    },
    {
      label: "Teplota nevim",
      value: engineData[28].value,
    },
  ];
};

export const getRowsTableMisc = (
  engineData: EngineUnit,
  thermalData: ThermalUnit
): TableData => {
  return [
    {
      label: "Zavora",
      value: thermalData[29].value,
    },
    {
      label: "Vanicka",
      value: thermalData[28].value,
    },
    {
      label: "Svetlo",
      value: thermalData[31].value,
    },
    {
      label: "Levy motor",
      value: thermalData[32].value,
    },
    {
      label: "Pravy motor",
      value: thermalData[30].value,
    },
  ];
};
