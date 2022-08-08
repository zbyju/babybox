const winston = require("winston");

const winStart = require("./logic/start/windows");
const winInstall = require("./logic/install/windows");
const { getFulltimeFormatted } = require("./utils/time");

async function main() {
  let canStartup = true;
  const args = process.argv.slice(2);
  const shouldInstall = args.find((a) => a.toLowerCase() === "--install");
  if (shouldInstall !== undefined) {
    const installLogger = winston.createLogger({
      format: winston.format.json(),
      defaultMeta: { module: "startup/install" },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: "../../logs/startup.install.log",
        }),
      ],
    });
    installLogger.info(`${getFulltimeFormatted()} - Starting the installation`);
    const res = await winInstall();
    if (res === true) {
      installLogger.info(`${getFulltimeFormatted()} - Installation successful`);
      canStartup = true;
    } else {
      installLogger.error(`${getFulltimeFormatted()} - Installation failed`);
      canStartup = false;
    }
  }
  if (canStartup) {
    const logger = winston.createLogger({
      format: winston.format.json(),
      defaultMeta: { module: "startup" },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "../../logs/startup.log" }),
      ],
    });
    logger.info(`${getFulltimeFormatted()} - Starting babybox panel!`);
    const res = await winStart();
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
}

main();
