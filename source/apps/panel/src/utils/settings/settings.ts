import type { JsonResponse } from "@/api/http";
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

import { isNullish, isObject, whenNotNullish } from "../general";
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

/**
 * The engine and thermal settings from a GET answer, split into values.
 * Undefined when the body has another shape.
 */
export const readUnitSettings = (
  body: unknown,
): { engine: string[]; thermal: string[] } | undefined => {
  if (!isObject(body)) return undefined;
  const data = body["data"];
  if (!isObject(data)) return undefined;
  const engine = data["engine"];
  const thermal = data["thermal"];
  if (typeof engine !== "string" || typeof thermal !== "string") {
    return undefined;
  }
  return { engine: engine.split("|"), thermal: thermal.split("|") };
};

const isSendResult = (value: unknown): value is SettingsSendResult =>
  isObject(value) &&
  (value["unit"] === "engine" || value["unit"] === "thermal") &&
  typeof value["index"] === "number" &&
  typeof value["value"] === "number" &&
  typeof value["result"] === "boolean";

/* Throws without a results list, as reading it did before. The save catches it. */
const readSendResults = (body: unknown): SettingsSendResult[] => {
  if (!isObject(body) || !Array.isArray(body["results"])) {
    throw new Error("The settings answer has no results list.");
  }
  return body["results"].filter(isSendResult);
};

export const settingsSendToStates = (
  response: JsonResponse,
  values: SettingsTableRowValue[],
  rows: SettingsTableRow[],
): SettingsTableRowValue[] => {
  const results = readSendResults(response.data);
  return values.map((value: SettingsTableRowValue, index: number) => {
    const row = rows[index];
    if (row === undefined) return value;
    const resultEngine = row.engine
      ? results.find((d) => d.index === row.engine && d.unit === "engine")
      : null;
    const resultThermal = row.thermal
      ? results.find((d) => d.index === row.thermal && d.unit === "thermal")
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
    if (row === undefined) return value;
    const data = changedValues;
    const resultEngine = row.engine
      ? data.find((d) => d.index === row.engine && d.unit === "engine")
      : null;
    const resultThermal = row.thermal
      ? data.find((d) => d.index === row.thermal && d.unit === "thermal")
      : null;

    if (resultEngine || resultThermal) {
      return { ...value, state: SettingsTableRowState.Error };
    } else {
      return value;
    }
  });
};
