import { promisify } from "util";
import { exec as execCallback } from "child_process";
import path from "path";
import fs from "fs-extra";
import sudo from "sudo-prompt";
import winston from "winston";
import { getFulltimeFormatted } from "../../utils/time.js";

const exec = promisify(execCallback);

async function checkInstalled(logger: winston.Logger): Promise<boolean> {
  try {
    await exec("node -v");
  } catch (err: unknown) {
    logger.error(
      `${getFulltimeFormatted()} - Failed installation - missing node (${err})`
    );
    return false;
  }
  try {
    await exec("npm -v");
  } catch (err: unknown) {
    logger.error(
      `${getFulltimeFormatted()} - Failed installation - missing npm (${err})`
    );
    return false;
  }
  try {
    await exec("git --version");
  } catch (err: unknown) {
    logger.error(
      `${getFulltimeFormatted()} - Failed installation - missing git (${err})`
    );
    return false;
  }
  return true;
}

async function installDeps(): Promise<void> {
  await exec("npm install -g pnpm@9");
  await exec("npm install -g pm2@latest");
  await exec("npm install -g nodemon");
  await exec("npm install -g typescript@5");
  await exec("npm install -g ts-node@10");
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function copyStartup(logger: winston.Logger): void {
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
    (error, _stdout, stderr) => {
      if (error || stderr) {
        logger.error(
          `${getFulltimeFormatted()} - Copying startup script failed (Error: ${error}\nStdErr: ${stderr})`
        );
        return;
      }
      logger.info(
        `${getFulltimeFormatted()} - Copying startup script successful)`
      );
    }
  );
}

export default async function install(): Promise<boolean> {
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
  const isInstalled = await checkInstalled(installLogger);
  if (!isInstalled) {
    installLogger.error(
      `${getFulltimeFormatted()} - Installation failed - dependencies missing`
    );
    return false;
  }

  await installDeps();
  return true;
}

// Keep fs and path imports to avoid unused variable warnings (they may be used in future)
void fs;
void path;
