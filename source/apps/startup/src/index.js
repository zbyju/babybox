const winston = require("winston");

const winStart = require("./logic/start/windows");
const ubuntuStart = require("./logic/start/ubuntu");
const { getFulltimeFormatted } = require("./utils/time");

async function main() {
  const args = process.argv.slice(2);
  const isUbuntu = args.some((a) => a.toLowerCase() === "--ubuntu");
  // Pull dela startup.sh, takze priznak o novem commitu prijde odtud
  const updated = args.some((a) => a.toLowerCase() === "--updated");

  const logger = winston.createLogger({
    format: winston.format.json(),
    defaultMeta: { module: "startup" },
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: "../../logs/startup.log" }),
    ],
  });
  logger.info(`${getFulltimeFormatted()} - Starting babybox panel!`);

  const res = isUbuntu ? await ubuntuStart(updated) : await winStart(updated);
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
