const util = require("util");
const exec = util.promisify(require("child_process").exec);
const path = require("path");
const fs = require("fs-extra");
const sudo = require("sudo-prompt");
const winston = require("winston");
const { getFulltimeFormatted } = require("../../utils/time");

async function checkInstalled(logger) {
  try {
    await exec("node -v");
  } catch (err) {
    logger.error(
      `${getFulltimeFormatted()} - Failed installation - missing node (${err})`
    );
    return false;
  }
  try {
    await exec("npm -v");
  } catch (err) {
    logger.error(
      `${getFulltimeFormatted()} - Failed installation - missing npm (${err})`
    );
    return false;
  }
  try {
    await exec("git --version");
  } catch (err) {
    logger.error(
      `${getFulltimeFormatted()} - Failed installation - missing git (${err})`
    );
    return false;
  }
  return true;
}

async function installDeps() {
  await exec("npm install -g pnpm");
  await exec("npm install -g pm2@latest");
  await exec("npm install -g nodemon");
  await exec("npm install -g typescript");
}

async function copyStartup(logger) {
  const pathToScript = path.resolve("./scripts/windows/startup.bat");
  const pathToLink = path.resolve(
    "C:/ProgramData/Microsoft/Windows/Start Menu/Programs/StartUp/babybox.bat"
  );
  const sudoOptions = {
    name: "Babybox Startup",
  };
  return sudo.exec(
    `mklink "${pathToLink}" "${pathToScript}"`,
    sudoOptions,
    (error, stdout, stderr) => {
      if (error || stderr) {
        logger.error(
          `${getFulltimeFormatted()} - Copying startup script failed (Error: ${error}\nStdErr: ${stderr})`
        );
        return false;
      }
      logger.info(
        `${getFulltimeFormatted()} - Copying startup script successful)`
      );
      return true;
    }
  );
}

module.exports = async function install() {
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
  // Check if node, npm, git are installed
  const isInstalled = checkInstalled(installLogger);
  if (!isInstalled) {
    installLogger.error(
      `${getFulltimeFormatted()} - Installation failed - dependencies missing`
    );
    return false;
  }

  await installDeps();
  return true;
};
