const fs = require("fs");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const path = require("path");
const sudo = require("sudo-prompt");
const logger = require("../../logger");
const strings = require("../../strings");

function isExactVersion(value) {
  return /^\d+\.\d+\.\d+$/.test(value);
}

function readPinnedPm2Version() {
  const text = fs.readFileSync(
    path.resolve(__dirname, "../../../versions.env"),
    "utf8"
  );
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed.indexOf("PM2_VERSION=") !== 0) {
      continue;
    }
    return trimmed.slice("PM2_VERSION=".length).trim();
  }
  return "";
}

async function checkInstalled() {
  try {
    await exec("node -v");
  } catch (err) {
    logger.error("install", strings.installMissingNode, err);
    return false;
  }
  try {
    await exec("npm -v");
  } catch (err) {
    logger.error("install", strings.installMissingNpm, err);
    return false;
  }
  try {
    await exec("git --version");
  } catch (err) {
    logger.error("install", strings.installMissingGit, err);
    return false;
  }
  return true;
}

async function installDeps() {
  try {
    const pm2Version = readPinnedPm2Version();
    if (!isExactVersion(pm2Version)) {
      throw new Error("PM2_VERSION chybi ve versions.env");
    }
    await exec("npm install -g pnpm@7.5.0");
    await exec(`npm install -g pm2@${pm2Version}`);
    await exec("npm install -g nodemon");
  } catch (err) {
    logger.error("install", strings.installDepsFailed, err);
    throw err;
  }
}

// eslint-disable-next-line no-unused-vars
async function copyStartup() {
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
        const err = error || new Error(String(stderr));
        err.stderr = stderr;
        logger.error("install", strings.installFailed, err);
        return false;
      }
      logger.info("install", strings.installSucceeded);
      return true;
    }
  );
}

module.exports = async function install() {
  const isInstalled = await checkInstalled();
  if (!isInstalled) {
    logger.error("install", strings.installFailed);
    return false;
  }

  try {
    await installDeps();
  } catch (err) {
    logger.error("install", strings.installFailed, err);
    return false;
  }
  return true;
};
