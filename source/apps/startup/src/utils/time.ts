import moment = require("moment");

export const getFulltimeFormatted = (): string => {
  return moment().format("DD.MM.YYYY HH:mm:ss");
};
