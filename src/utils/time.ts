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

export const convertSDSTimeToMoment = (engineUnit: EngineUnit): Moment => {
    return moment()
        .date(parseInt(engineUnit[39].value))
        .month(parseInt(engineUnit[40].value))
        .year(parseInt(engineUnit[41].value))
        .hour(parseInt(engineUnit[42].value))
        .minute(parseInt(engineUnit[43].value))
        .second(parseInt(engineUnit[44].value));
};
