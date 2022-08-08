import type { Maybe } from "@/types/generic.types";

export const prettyNumber = (num: number): string => {
  return String(Math.round(num).toFixed(0));
};

export const prettyFloat = (num: number, fractionDigits = 2): string => {
  return num.toFixed(fractionDigits);
};

export const prettyBoolean = (bool: boolean): string => {
  return bool ? "Ano" : "Ne";
};

export const displayTemperature = (num: number): string => {
  return `${prettyFloat(num)}°C`;
};

export const displayVoltage = (num: number): string => {
  return `${prettyFloat(num / 100)}V`;
};

export const displayPercentage = (num: number): string => {
  return `${prettyNumber(num)}%`;
};

export const displayTwoItems = <T>(
  x1: T,
  x2: T,
  toString: (x: T) => string,
): string => {
  return `${toString(x1)} | ${toString(x2)}`;
};

export const displayCustomBoolean = (
  bool: boolean,
  ifTrue: string,
  ifFalse: string,
): string => {
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
  seconds: number,
  inspectionNotDoneForDays: number,
): string => {
  if (inspectionNotDoneForDays > 0) return "Neprovedena";
  if (seconds < 0) return "Neprovedena";
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const dl = daysToString(d);
  return `${d} ${dl} ${zeroFilled(h, 2)}:${zeroFilled(m, 2)}:${zeroFilled(
    s,
    2,
  )}`;
};

export const daysToString = (days: number): string => {
  return days > 1 ? "dní" : days === 0 ? "den" : "";
};
