import type { Maybe } from "@/types/generic.types";
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

export const stringToVoltage = (str: string): Maybe<number> => {
  const res = parseInt(str);
  if (isNaN(res)) return undefined;
  return Number((res / 1096) * 32);
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
