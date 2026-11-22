const logger = require("./logger");
const strings = require("./strings");
const winStart = require("./logic/start/windows");
const ubuntuStart = require("./logic/start/ubuntu");
const winInstall = require("./logic/install/windows");
const ubuntuInstall = require("./logic/install/ubuntu");

async function main() {
  const args = process.argv.slice(2);
  const shouldInstall = args.find((a) => a.toLowerCase() === "--install");
  const isUbuntu = args.find((a) => a.toLowerCase() === "--ubuntu");

  if (shouldInstall !== undefined) {
    logger.info("install", strings.installStarted);
    const res =
      isUbuntu !== undefined ? await ubuntuInstall() : await winInstall();
    if (res === true) {
      logger.info("install", strings.installSucceeded);
    } else {
      logger.error("install", strings.installFailed);
      return 1;
    }
  }
  logger.info("start", strings.startBegin);
  const start = isUbuntu !== undefined ? ubuntuStart : winStart;
  if (await start({ requireHealthy: shouldInstall !== undefined })) {
    logger.info("start", strings.startSucceeded);
    return 0;
  }
  logger.error("start", strings.startFailed);
  return 1;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (err) => {
    logger.error("start", strings.startFailed, err);
    process.exitCode = 1;
  }
);
