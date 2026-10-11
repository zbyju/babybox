import type { Moment } from "moment";
import moment from "moment";

export const getTimeDifferenceInSeconds = (
  t1: Moment | null | undefined,
  t2: Moment | null | undefined
): number => {
  if (!t1 || !t2 || !t1.isValid() || !t2.isValid())
    return Number.MAX_SAFE_INTEGER;
  return Math.abs(t1.diff(t2, "seconds"));
};

export const getFullTimeFormatted = (): string => {
  return moment().format("DD.MM.YYYY HH:mm:ss");
};
