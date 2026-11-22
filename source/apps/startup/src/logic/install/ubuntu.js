const util = require("util");
const exec = util.promisify(require("child_process").exec);
const logger = require("../../logger");
const strings = require("../../strings");
const { pinnedPm2Version } = require("./pm2-version");

async function checkInstalled(exec, logger) {
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

async function installDeps(exec, logger) {
  try {
    const pm2Version = pinnedPm2Version();
    await exec("npm install -g pnpm@7.5.0");
    await exec(`npm install -g pm2@${pm2Version}`);
  } catch (err) {
    logger.error("install", strings.installDepsFailed, err);
    throw err;
  }
}

module.exports = async function install(options = {}) {
  const run = options.exec || exec;
  const log = options.logger || logger;
  const isInstalled = await checkInstalled(run, log);
  if (!isInstalled) {
    log.error("install", strings.installFailed);
    return false;
  }

  try {
    await installDeps(run, log);
  } catch (err) {
    log.error("install", strings.installFailed, err);
    return false;
  }
  return true;
};
