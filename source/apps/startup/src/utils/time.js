const moment = require("moment");

module.exports = {
  getFulltimeFormatted: () => {
    return moment().format("DD.MM.YYYY HH:mm:ss");
  },
};
