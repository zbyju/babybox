import moment from "moment";

import type { Maybe } from "@/types/generic.types";

function asMoment(time: Maybe<number>) {
  if (time === undefined || !Number.isFinite(time)) return undefined;
  const parsed = moment(time);
  return parsed.isValid() ? parsed : undefined;
}

export const getHoursWithLeadingZeroes = (time: Maybe<number>): string => {
  const parsed = asMoment(time);
  if (!parsed) return "--";
  const hours = parsed.hours().toString();
  return hours.length == 2 ? hours : "0" + hours;
};

export const getMinutesWithLeadingZeroes = (time: Maybe<number>): string => {
  const parsed = asMoment(time);
  if (!parsed) return "--";
  const minutes = parsed.minutes().toString();
  return minutes.length == 2 ? minutes : "0" + minutes;
};

export const getFullTime = (time: Maybe<number>): string => {
  const parsed = asMoment(time);
  if (!parsed) return "--";
  return parsed.format("HH:mm:ss");
};

export const getFullDate = (time: Maybe<number>): string => {
  const parsed = asMoment(time);
  if (!parsed) return "--";
  return parsed.format("DD.MM.YYYY");
};

export const getCurrentTimePC = (): number => {
  return moment().valueOf();
};
