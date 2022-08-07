const winston = require("winston");

const winStart = require("./logic/start/windows");
const { getFulltimeFormatted } = require("./utils/time");

async function main() {
  const logger = winston.createLogger({
    format: winston.format.json(),
    defaultMeta: { module: "startup" },
    transports: [
      new winston.transports.File({ filename: "../../logs/startup.log" }),
    ],
  });
  logger.info(`${getFulltimeFormatted()} - Starting babybox panel`);
  const res = await winStart();
  console.log("test");
  if (res === true) {
    logger.info(
      `${getFulltimeFormatted()} - Successfully started babybox panel`
    );
  } else {
    logger.error(
      `${getFulltimeFormatted()} - Error when starting babybox panel`
    );
  }
}

main();
