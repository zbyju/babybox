import type { EngineUnit } from "@/pinia/unitsStore";
import moment from "moment";
import type { Moment } from "moment";

export const getHoursWithLeadingZeroes = (time: Moment): string => {
  if (!time || !moment(time).isValid()) return "--";
  const hours = time.hours().toString();
  return hours.length == 2 ? hours : "0" + hours;
};

export const getMinutesWithLeadingZeroes = (time: Moment): string => {
  if (!time || !moment(time).isValid()) return "--";
  const minutes = time.minutes().toString();
  return minutes.length == 2 ? minutes : "0" + minutes;
};

export const getFullTime = (time: Moment): string => {
  if (!time || !moment(time).isValid()) return "--";
  return time.format("HH:mm:ss");
};

export const getFullDate = (time: Moment): string => {
  if (!time || !moment(time).isValid()) return "--";
  return time.format("DD.MM.YYYY");
};

export const getCurrentTimePC = (): Moment => {
  return moment();
};
