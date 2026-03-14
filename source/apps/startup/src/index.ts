import winston from "winston";

import winStart from "./logic/start/windows";
import ubuntuStart from "./logic/start/ubuntu";
import winInstall from "./logic/install/windows";
import ubuntuInstall from "./logic/install/ubuntu";
import { getFulltimeFormatted } from "./utils/time";

async function main(): Promise<void> {
  let canStartup = true;
  const args: string[] = process.argv.slice(2);
  const shouldInstall = args.find((a) => a.toLowerCase() === "--install");
  const isUbuntu = args.find((a) => a.toLowerCase() === "--ubuntu");

  // Do install
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
    const res =
      isUbuntu !== undefined ? await ubuntuInstall() : await winInstall();
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
    const res = isUbuntu !== undefined ? await ubuntuStart() : await winStart();
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
