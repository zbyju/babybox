import type { Maybe } from "@/types/generic.types";
import type { VoltageConfig } from "@/types/panel/main.types";
import { TableBlockState, TableRowState } from "@/types/panel/tables.types";
import type { Moment } from "moment";
import moment from "moment";

export const stringToNumber = (str: string): Maybe<number> => {
  const res = parseInt(str);
  if (isNaN(res)) return undefined;
  return res;
};

export const stringToNumberWithDecimals = (str: string): Maybe<number> => {
  const res = parseInt(str);
  if (isNaN(res)) return undefined;
  return Number(res / 100);
};

export const numberToVoltage = (
  num: number,
  voltageConfig: VoltageConfig,
): number => {
  return (
    (num * voltageConfig.multiplier) / voltageConfig.divider +
    voltageConfig.addition
  );
};

export const stringToVoltage = (
  str: string,
  voltageConfig: VoltageConfig,
): Maybe<number> => {
  const res = parseInt(str);
  if (isNaN(res)) return undefined;
  return numberToVoltage(res, voltageConfig);
};

export const stringBooleanToBoolean = (str: string): Maybe<boolean> => {
  const res = parseInt(str);
  if (isNaN(res)) return undefined;
  return res !== 0;
};

export const partitionedTimeToMoment = (
  day: string,
  month: string,
  year: string,
  hour: string,
  minute: string,
  second: string,
): Maybe<Moment> => {
  const res = moment(`${year}-${month}-${day} ${hour}:${minute}:${second}`);
  if (!res.isValid()) return undefined;
  return res;
};

export const booleanToTableBlockState = (
  bool: Maybe<boolean>,
  activeColor: TableBlockState = TableBlockState.ColorSuccess,
): TableBlockState => {
  if (bool === undefined) return TableBlockState.Error;
  if (bool === true) return activeColor;
  return TableBlockState.Inactive;
};

export function maybeValueToTableRowValue<T>(
  val: Maybe<T>,
  display: (value: T, ...args: any[]) => string,
  args: any[] = [],
  okState: TableRowState = TableRowState.Ok,
) {
  if (val === undefined)
    return {
      state: TableRowState.Error,
    };
  else {
    return {
      state: okState,
      value: display(val, ...args),
    };
  }
}
