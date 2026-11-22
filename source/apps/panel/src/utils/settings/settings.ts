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

import { isNullish, whenNotNullish } from "../general";
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
      const engineValue = whenNotNullish(curr.engine, Number(curr.engine));
      const thermalValue = whenNotNullish(curr.thermal, Number(curr.thermal));

      if (curr.value === null || !isNumber(curr.value)) return res;
      const row = rows[index];
      if (row === undefined) return res;

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
    [],
  );
};

function targetsRow(setting: SettingsToSend, row: SettingsTableRow): boolean {
  return setting.index === row[setting.unit];
}

export const settingsSendToStates = (
  results: SettingsSendResult[],
  values: SettingsTableRowValue[],
  rows: SettingsTableRow[],
): SettingsTableRowValue[] =>
  values.map((value, index) => {
    const row = rows[index];
    if (row === undefined) return value;
    const entries = results.filter((result) => targetsRow(result, row));
    if (entries.length === 0) return value;
    const state = settingsResultsToState(
      entries.every(({ result }) => result),
      entries.some(({ result }) => result),
    );
    return { ...value, state };
  });

export const settingsSendToStatesError = (
  submitted: SettingsToSend[],
  values: SettingsTableRowValue[],
  rows: SettingsTableRow[],
): SettingsTableRowValue[] =>
  values.map((value, index) => {
    const row = rows[index];
    if (row === undefined || !submitted.some((entry) => targetsRow(entry, row))) {
      return value;
    }
    return { ...value, state: SettingsTableRowState.Error };
  });
