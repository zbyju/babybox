const logger = require("./logger");
const strings = require("./strings");
const winStart = require("./logic/start/windows");
const ubuntuStart = require("./logic/start/ubuntu");
const winInstall = require("./logic/install/windows");
const ubuntuInstall = require("./logic/install/ubuntu");

async function main() {
  let canStartup = true;
  const args = process.argv.slice(2);
  const shouldInstall = args.find((a) => a.toLowerCase() === "--install");
  const isUbuntu = args.find((a) => a.toLowerCase() === "--ubuntu");

  if (shouldInstall !== undefined) {
    logger.info("install", strings.installStarted);
    const res =
      isUbuntu !== undefined ? await ubuntuInstall() : await winInstall();
    if (res === true) {
      logger.info("install", strings.installSucceeded);
      canStartup = true;
    } else {
      logger.error("install", strings.installFailed);
      canStartup = false;
    }
  }
  if (canStartup) {
    logger.info("start", strings.startBegin);
    const res = isUbuntu !== undefined ? await ubuntuStart() : await winStart();
    if (res === true) {
      logger.info("start", strings.startSucceeded);
    } else {
      logger.error("start", strings.startFailed);
    }
  }
}

main();
