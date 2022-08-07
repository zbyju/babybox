const winston = require("winston");

const winStart = require("./logic/windows");
const { getFulltimeFormatted } = require("./utils/time");

function main() {
  const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    defaultMeta: { module: "startup" },
    transports: [
      new winston.transports.File({ filename: "../../logs/startup.log" }),
    ],
  });
  logger.info(`${getFulltimeFormatted()} - Starting babybox panel`);
  winStart();
}

main();
