const util = require("util");
const exec = util.promisify(require("child_process").exec);
const path = require("path");
const fs = require("fs-extra");
const sudo = require("sudo-prompt");

async function checkInstalled() {
  try {
    await exec("node -v");
  } catch (err) {
    console.log("Node not installed");
    return false;
  }
  try {
    await exec("npm -v");
  } catch (err) {
    console.log("NPM not installed");
    return false;
  }
  try {
    await exec("git -v");
  } catch (err) {
    console.log("GIT not installed");
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

async function copyStartup() {
  const pathToScript = path.resolve("./scripts/windows/startup.bat");
  const pathToLink = path.resolve(
    "C:/ProgramData/Microsoft/Windows/Start Menu/Programs/StartUp/babybox.bat"
  );
  const sudoOptions = {
    name: "Babybox Startup",
  };
  sudo.exec(
    `mklink "${pathToLink}" "${pathToScript}"`,
    sudoOptions,
    (error, stdout, stderr) => {
      if (error || stderr) {
        console.log("Startup file was not copied");
      }
    }
  );
}

module.exports = async function install() {
  // Check if node, npm, git are installed
  const isInstalled = checkInstalled();
  if (!isInstalled) {
    return false;
  }

  await installDeps();

  if (
    !fs.existsSync(
      "C:/ProgramData/Microsoft/Windows/Start Menu/Programs/StartUp/babybox.bat"
    )
  ) {
    const isCopied = copyStartup();
    if (!isCopied) return false;
  }
};
