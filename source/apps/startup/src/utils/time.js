import { moment } from "moment";

export const getFulltimeFormatted = () => {
  return moment().format("DD.MM.YYYY HH:mm:ss");
};
