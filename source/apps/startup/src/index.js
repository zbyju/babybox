const logger = require("./logger");
const strings = require("./strings");
const winStart = require("./logic/start/windows");
const ubuntuStart = require("./logic/start/ubuntu");
const winInstall = require("./logic/install/windows");
const ubuntuInstall = require("./logic/install/ubuntu");
const registerWindowsAutostart = require("./logic/install/windows-autostart");

async function main() {
  const args = process.argv.slice(2).map((arg) => arg.toLowerCase());
  const shouldInstall = args.includes("--install");
  const isUbuntu = args.includes("--ubuntu");

  if (shouldInstall) {
    logger.info("install", strings.installStarted);
    const installed = await (isUbuntu ? ubuntuInstall() : winInstall());
    if (!installed) {
      logger.error("install", strings.installFailed);
      return 1;
    }
  }

  logger.info("start", strings.startBegin);
  const started = await (isUbuntu ? ubuntuStart() : winStart());
  if (!started) {
    logger.error("start", strings.startFailed);
    return 1;
  }
  logger.info("start", strings.startSucceeded);

  if (shouldInstall) {
    if (!isUbuntu) {
      registerWindowsAutostart();
    }
    logger.info("install", strings.installSucceeded);
  }
  return 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    logger.error("start", strings.startFailed, error);
    process.exitCode = 1;
  }
);
