import { useConfigStore } from "@/pinia/configStore";
import type { Maybe } from "@/types/generic.types";
import {
  SettingsTableRowState,
  SettingsTableRowValueType,
} from "@/types/settings/table.types";

import { isNumber } from "../number";

export const typeToMeasureUnit = (type: SettingsTableRowValueType): string => {
  switch (type) {
    case SettingsTableRowValueType.String:
      return "";
    case SettingsTableRowValueType.Temperature:
      return "°C";
    case SettingsTableRowValueType.Voltage:
      return "V";
    case SettingsTableRowValueType.Seconds:
      return "s";
    case SettingsTableRowValueType.Days:
      return "den";
  }
};

export const settingsRowValueToValue = (
  value: string,
  type: SettingsTableRowValueType,
): Maybe<number> => {
  if (!isNumber(value) || value === "") return undefined;
  if (type === SettingsTableRowValueType.Temperature)
    return Number(value) * 100;

  if (type === SettingsTableRowValueType.Voltage) {
    const divider = useConfigStore()?.units?.voltage?.divider || 63;
    const multiplier = useConfigStore()?.units?.voltage?.multiplier || 100;
    return Math.round(Number(value) * divider);
  }

  if (type === SettingsTableRowValueType.Days) {
    return Number(value) * 86400;
  }

  return Number(value);
};

export const settingsResultsToState = (
  engineResult: boolean,
  thermalResult: boolean,
): SettingsTableRowState => {
  if (engineResult && thermalResult) return SettingsTableRowState.Success;
  if (!engineResult && !thermalResult) return SettingsTableRowState.Error;
  return SettingsTableRowState.Warning;
};
