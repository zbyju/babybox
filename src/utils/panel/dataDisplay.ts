import type { Maybe } from "@/types/generic.types";
import type { RowData } from "@/types/panel/tables.types";

export const prettyNumber = (
  num: Maybe<number>,
  errorMessage: string,
): string => {
  if (num === undefined) return errorMessage;
  return String(Math.round(num).toFixed(0));
};

export const prettyFloat = (
  num: Maybe<number>,
  errorMessage: string,
): string => {
  if (num === undefined) return errorMessage;
  return num.toFixed(2);
};

export const prettyBoolean = (
  bool: Maybe<boolean>,
  errorMessage: string,
): string => {
  if (bool === undefined) return errorMessage;
  return bool ? "Ano" : "Ne";
};

export const displayTemperature = (
  num: Maybe<number>,
  errorMessage: string,
): string => {
  return `${prettyFloat(num, errorMessage)}°C`;
};

export const displayVoltage = (
  num: Maybe<number>,
  errorMessage: string,
): string => {
  return `${prettyFloat(num, errorMessage)}V`;
};

export const displayPercentage = (
  num: Maybe<number>,
  errorMessage: string,
): string => {
  return `${prettyNumber(num, errorMessage)}%`;
};

export const displayTwoItems = <T>(
  x1: Maybe<T>,
  x2: Maybe<T>,
  toString: (x: Maybe<T>, errorMessage: string) => string,
  errorMessage: string,
): string => {
  return `${toString(x1, errorMessage)} | ${toString(x2, errorMessage)}`;
};

export const displayCustomBoolean = (
  bool: Maybe<boolean>,
  ifTrue: string,
  ifFalse: string,
  errorMessage: string,
): string => {
  if (bool === undefined) return errorMessage;
  return bool ? ifTrue : ifFalse;
};

export const isInInterval = (
  val: Maybe<number>,
  min: Maybe<number>,
  max: Maybe<number>,
): boolean => {
  if (val === undefined || min === undefined || max === undefined) return false;
  return val >= min && val <= max;
};

export const isLower = (val: Maybe<number>, max: Maybe<number>): boolean => {
  if (val === undefined || max === undefined) return false;
  return val <= max;
};

export const isHigher = (val: Maybe<number>, min: Maybe<number>): boolean => {
  if (val === undefined || min === undefined) return false;
  return val >= min;
};

const zeroFilled = (num: number, padlen: number): string => {
  const pad_char = "0";
  const pad = new Array(1 + padlen).join(pad_char);
  return (pad + num).slice(-pad.length);
};

export const secondsToTime = (
  seconds: Maybe<number>,
  errorMessage: string,
): string => {
  if (seconds === undefined) return errorMessage;
  if (seconds < 0) return "Neprovedena";
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const dl = d > 1 ? "dnů" : d == 0 ? "den" : "";
  return `${d} ${dl} ${zeroFilled(h, 2)}:${zeroFilled(m, 2)}:${zeroFilled(
    s,
    2,
  )}`;
};

// export const parseIntOrEmpty = (x: string): number => {
//   if (!x || x === "") throw "Not a number";
//   const parsed = parseInt(x);
//   if (isNaN(parsed)) throw "Not a number";
//   return parsed;
// };

// export const prettyTemperature = (temp: string): string => {
//   try {
//     const parsed = parseIntOrEmpty(temp);
//     return `${(parsed / 100).toFixed(2)}°C`;
//   } catch (err) {
//     return "";
//   }
// };

// export const prettyVoltage = (x: string): string => {
//   try {
//     const parsed = parseIntOrEmpty(x);
//     return ((parsed / 1096) * 32).toFixed(1) + "V";
//   } catch (err) {
//     return "";
//   }
// };

// export const prettyInt = (num: number): string => {
//   if (num == null || num == undefined || isNaN(num)) return "";
//   return num.toFixed(0);
// };

// export const prettyNumber = (num: number): string => {
//   return num.toFixed(2);
// };

// export const prettyBooleanString = (s: string): string => {
//   const boolean = parseBoolean(s);
//   return prettyBoolean(boolean);
// };

// export const prettyBoolean = (bool: boolean): string => {
//   return bool ? "Ano" : "Ne";
// };

// export const prettyPercentage = (num: number): string => {
//   if (num !== 0 && (!num || isNaN(num))) return "";
//   return `${prettyNumber(num)}%`;
// };

// export const prettyTwoTemperatures = (temp1: string, temp2: string): string => {
//   return prettyTwoItems(prettyTemperature(temp1), prettyTemperature(temp2));
// };

// export const prettyTwoPercentages = (num1: number, num2: number): string => {
//   return prettyTwoItems(prettyPercentage(num1), prettyPercentage(num2));
// };

// export const prettyTwoNumbers = (num1: number, num2: number): string => {
//   try {
//     return prettyTwoItems(num1.toString(), num2.toString());
//   } catch (err) {
//     return "";
//   }
// };

// export const prettyTwoItems = (s1: string, s2: string): string => {
//   if (
//     s1 == null ||
//     s1 == undefined ||
//     s1 == NaN.toString() ||
//     s1 == "" ||
//     s2 == null ||
//     s2 == undefined ||
//     s2 == NaN.toString() ||
//     s2 == ""
//   )
//     return "";
//   return `${s1} | ${s2}`;
// };

// export const beamAboveContainer = (s: string): string => {
//   try {
//     const parsed = parseIntOrEmpty(s);
//     if (parsed === 255) return "Překážka";
//     else return "Volno";
//   } catch (err) {
//     return "";
//   }
// };

// const zeroFilled = (num: number, padlen: number): string => {
//   const pad_char = "0";
//   const pad = new Array(1 + padlen).join(pad_char);
//   return (pad + num).slice(-pad.length);
// };

// export const secondsToTime = (str: string): string => {
//   try {
//     const parsed: number = parseIntOrEmpty(str);
//     if (parsed < 0) return "Neprovedena";
//     const d = Math.floor(parsed / (3600 * 24));
//     const h = Math.floor((parsed % (3600 * 24)) / 3600);
//     const m = Math.floor((parsed % 3600) / 60);
//     const s = Math.floor(parsed % 60);
//     const dl = d > 1 ? "dnů" : d == 0 ? "den" : "";
//     return `${d} ${dl} ${zeroFilled(h, 2)}:${zeroFilled(m, 2)}:${zeroFilled(
//       s,
//       2,
//     )}`;
//   } catch (err) {
//     return "";
//   }
// };

// export const errorInnerTemperature = (
//   engineData: EngineUnit,
//   thermalData: ThermalUnit,
// ): boolean => {
//   const parsedTemperature = parseInt(thermalData[29].value);
//   const parsedMin = parseInt(thermalData[3].value);
//   const parsedMax = parseInt(thermalData[4].value);
//   return parsedTemperature < parsedMin || parsedTemperature > parsedMax;
// };

// export const errorVoltageIn = (
//   engineData: EngineUnit,
//   thermalData: ThermalUnit,
// ): boolean => {
//   const parsedVoltage = parseInt(thermalData[35].value);
//   const parsedMin = parseInt(thermalData[6].value);
//   return parsedVoltage < parsedMin;
// };

// export const errorVoltageBattery = (
//   engineData: EngineUnit,
//   thermalData: ThermalUnit,
// ): boolean => {
//   const parsedVoltage = parseInt(thermalData[36].value);
//   const parsedMin = parseInt(thermalData[6].value);
//   return parsedVoltage < parsedMin;
// };

// export const errorVoltageUnits = (
//   engineData: EngineUnit,
//   thermalData: ThermalUnit,
// ): boolean => {
//   const parsedVoltage = parseInt(thermalData[37].value);
//   const parsedMin = parseInt(thermalData[6].value);
//   return parsedVoltage < parsedMin;
// };

// export const errorVoltageGSM = (
//   engineData: EngineUnit,
//   thermalData: ThermalUnit,
// ): boolean => {
//   const parsedVoltage = parseInt(thermalData[38].value);
//   const parsedMin = parseInt(thermalData[6].value);
//   return parsedVoltage < parsedMin;
// };
