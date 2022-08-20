import type {
  SettingsSendResult,
  SettingsToSend,
} from "@/types/settings/manager.types";
import {
  type SettingsTableRow,
  type SettingsTableRowValue,
  SettingsTableRowState,
  SettingsTableRowValueType,
} from "@/types/settings/table.types";

import { isNullish } from "../general";
import { isNumber } from "../number";
import { settingsResultsToState, settingsRowValueToValue } from "./conversions";

export const isSettingChanged = (
  engineValue: number | null | undefined,
  thermalValue: number | null | undefined,
  rowValue: string,
  type: SettingsTableRowValueType,
): boolean => {
  const value = settingsRowValueToValue(rowValue, type);
  if (!isNullish(engineValue) && !isNullish(thermalValue)) {
    return engineValue !== value || thermalValue !== value;
  } else if (!isNullish(engineValue)) {
    return engineValue !== value;
  } else if (!isNullish(thermalValue)) {
    return thermalValue !== value;
  }
  return true;
};

export const getChangedSettings = (
  settings: SettingsTableRowValue[],
  rows: SettingsTableRow[],
): SettingsToSend[] => {
  return settings.reduce(
    (
      res: SettingsToSend[],
      curr: SettingsTableRowValue,
      index: number,
    ): SettingsToSend[] => {
      const engineValue = curr.engine !== null ? Number(curr.engine) : null;
      const thermalValue = curr.thermal !== null ? Number(curr.thermal) : null;
      if (curr.value === null || !isNumber(curr.value)) return res;
      const row = rows[index];

      if (!isSettingChanged(engineValue, thermalValue, curr.value, row.type))
        return res;

      const value = settingsRowValueToValue(curr.value, row.type);
      if (value === undefined) return res;
      if (row.engine !== null) {
        res.push({
          unit: "engine",
          value,
          index: row.engine,
        });
      }
      if (row.thermal !== null) {
        res.push({
          unit: "thermal",
          value,
          index: row.thermal,
        });
      }
      return res;
    },
    [] as SettingsToSend[],
  );
};

export const updateValueBasedOnResult = (
  resultEngine: SettingsSendResult | null | undefined,
  resultThermal: SettingsSendResult | null | undefined,
  value: SettingsTableRowValue,
): SettingsTableRowValue => {
  if (!isNullish(resultEngine)) {
    if (!isNullish(resultThermal)) {
      // Both were sent
      return {
        ...value,
        state: settingsResultsToState(
          resultEngine!.result,
          resultThermal!.result,
        ),
      };
    } else {
      // Only engine was sent
      return {
        ...value,
        state: settingsResultsToState(resultEngine!.result, true),
      };
    }
  } else {
    if (!isNullish(resultThermal)) {
      // Only thermal was sent
      return {
        ...value,
        state: settingsResultsToState(true, resultThermal!.result),
      };
    } else {
      // None of them were sent
      return value;
    }
  }
};

export const settingsSendToStates = (
  response: any,
  values: SettingsTableRowValue[],
  rows: SettingsTableRow[],
): SettingsTableRowValue[] => {
  return values.map((value: SettingsTableRowValue, index: number) => {
    const row = rows[index];
    const data = response.data;
    const resultEngine = row.engine
      ? data.results.find(
          (d: any) => d.index === row.engine && d.unit === "engine",
        )
      : null;
    const resultThermal = row.thermal
      ? data.results.find(
          (d: any) => d.index === row.thermal && d.unit === "thermal",
        )
      : null;

    return updateValueBasedOnResult(resultEngine, resultThermal, value);
  });
};

export const settingsSendToStatesError = (
  changedValues: SettingsToSend[],
  values: SettingsTableRowValue[],
  rows: SettingsTableRow[],
): SettingsTableRowValue[] => {
  return values.map((value: SettingsTableRowValue, index: number) => {
    const row = rows[index];
    const data = changedValues;
    const resultEngine = row.engine
      ? data.find((d: any) => d.index === row.engine && d.unit === "engine")
      : null;
    const resultThermal = row.thermal
      ? data.find((d: any) => d.index === row.thermal && d.unit === "thermal")
      : null;

    if (resultEngine || resultThermal) {
      return { ...value, state: SettingsTableRowState.Error };
    } else {
      return value;
    }
  });
};
