import { Moment } from "moment";

export const getTimeDifferenceInSeconds = (t1: Moment, t2: Moment): number => {
  if (!t1 || !t2 || !t1.isValid() || !t2.isValid)
    return Number.MAX_SAFE_INTEGER;
  return Math.abs(t1.diff(t2, "seconds"));
};
