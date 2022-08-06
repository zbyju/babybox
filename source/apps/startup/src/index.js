import winston from "winston";

import { start as winStart } from "./logic/windows";
import { getFulltimeFormatted } from "./utils/time";

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
