import { Moment } from "moment";
import moment = require("moment");

export const getTimeDifferenceInSeconds = (t1: Moment, t2: Moment): number => {
  if (!t1 || !t2 || !t1.isValid() || !t2.isValid)
    return Number.MAX_SAFE_INTEGER;
  return Math.abs(t1.diff(t2, "seconds"));
};

export const getFullTimeFormatted = (): string => {
  return moment().format("DD.MM.YYYY HH:mm:ss");
};
