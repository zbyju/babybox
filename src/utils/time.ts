import { EngineUnit } from "@/types/units-data";
import moment from "moment";

export const getHoursWithLeadingZeroes = (time: moment.Moment): string => {
  if (!time || !moment(time).isValid()) return "--";
  const hours = time.hours().toString();
  return hours.length == 2 ? hours : "0" + hours;
};

export const getMinutesWithLeadingZeroes = (time: moment.Moment): string => {
  if (!time || !moment(time).isValid()) return "--";
  const minutes = time.minutes().toString();
  return minutes.length == 2 ? minutes : "0" + minutes;
};

export const getFullTime = (time: moment.Moment): string => {
  if (!time || !moment(time).isValid()) return "--";
  return time.format("HH:mm:ss");
};

export const getFullDate = (time: moment.Moment): string => {
  if (!time || !moment(time).isValid()) return "--";
  return time.format("DD.MM.YYYY");
};

export const getCurrentTimePC = (): moment.Moment => {
  return moment();
};

export const convertSDSTimeToMoment = (
  engineUnit: EngineUnit
): moment.Moment => {
  return moment()
    .date(parseInt(engineUnit[39].value))
    .month(parseInt(engineUnit[40].value))
    .year(parseInt(engineUnit[41].value))
    .hour(parseInt(engineUnit[42].value))
    .minute(parseInt(engineUnit[43].value))
    .second(parseInt(engineUnit[44].value));
};
