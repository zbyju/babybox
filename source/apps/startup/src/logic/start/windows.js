const util = require("util");
const exec = util.promisify(require("child_process").exec);
const spawn = require("child_process").spawn;
const fs = require("fs-extra");
const winston = require("winston");
const { getFulltimeFormatted } = require("../../utils/time");

const Result = {
  Error: "ResultError",
  Success: "ResultSuccess",
};

const UpdateResult = {
  Error: "UpdateError",
  Updated: "UpdateSuccess",
  Unchanged: "UpdateUnchanged",
};

const updateLogger = winston.createLogger({
  format: winston.format.json(),
  defaultMeta: { module: "startup/update" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "../../logs/startup.update.log" }),
  ],
});

const buildLogger = winston.createLogger({
  format: winston.format.json(),
  defaultMeta: { module: "startup/build" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "../../logs/startup.build.log" }),
  ],
});

const overrideLogger = winston.createLogger({
  format: winston.format.json(),
  defaultMeta: { module: "startup/override" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: "../../logs/startup.override.log",
    }),
  ],
});

const startLogger = winston.createLogger({
  format: winston.format.json(),
  defaultMeta: { module: "startup/start" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "../../logs/startup.start.log" }),
  ],
});

async function update() {
  try {
    const { stdout, stderr } = await exec("git pull", { cwd: "../../" });
    if (stderr) {
      updateLogger.error(
        `${getFulltimeFormatted()} - StdError when updating (${stderr})`
      );
      return UpdateResult.Error;
    }
    if (stdout.toLowerCase().includes("already up to date")) {
      updateLogger.info(`${getFulltimeFormatted()} - Already up to date`);
      return UpdateResult.Unchanged;
    }
    updateLogger.info(`${getFulltimeFormatted()} - Update successful!`);
    return UpdateResult.Updated;
  } catch (err) {
    updateLogger.error(
      `${getFulltimeFormatted()} - Error when updating (${err})`
    );
    return UpdateResult.Error;
  }
}

async function build() {
  try {
    const { stderr } = await exec("pnpm run build", { cwd: "../../" });
    if (stderr) {
      buildLogger.error(
        `${getFulltimeFormatted()} - Build stderror - ${stderr}`
      );
      return Result.Error;
    }
    buildLogger.info(`${getFulltimeFormatted()} - Build successful!`);
    return Result.Success;
  } catch (err) {
    buildLogger.error(`${getFulltimeFormatted()} - Build error - ${err}`);
    return Result.Error;
  }
}

async function override() {
  // Rename dist to old
  const doesExistDist = fs.existsSync("../../../dist");
  if (doesExistDist) {
    const doesExistDist2 = fs.existsSync("../../../dist2");
    if (doesExistDist2) {
      try {
        fs.rmSync("../../../dist2", { recursive: true, force: true });
      } catch (err) {
        overrideLogger.error(
          `${getFulltimeFormatted()} - Error when pre-removing dist2 - ${err}`
        );
        return Result.Error;
      }
    }
    try {
      // Remove node_modules because they have read_only attributes and cant be moved
      if (fs.existsSync("../../../dist/node_modules")) {
        fs.rmSync("../../../dist/node_modules", {
          maxRetries: 3,
          recursive: true,
        });
      }
      fs.renameSync("../../../dist", "../../../dist2");
    } catch (err) {
      overrideLogger.error(
        `${getFulltimeFormatted()} - Error when renaming dist to dist2 - ${err}`
      );
      return Result.Error;
    }
  }
  // Check if build is ready
  const doesExistBuild =
    fs.existsSync("../backend/dist") && fs.existsSync("../panel/dist");
  if (!doesExistBuild) {
    await build();
  }

  // Move dist build to root dir
  try {
    fs.copySync("../backend/dist", "../../../dist");
    fs.copySync("../panel/dist", "../../../dist/public");
    fs.copyFileSync("../backend/.env", "../../../dist/.env");
    fs.copyFileSync("../backend/package.json", "../../../dist/package.json");
    await exec("pnpm install", { cwd: "../../../dist" });

    overrideLogger.info(`${getFulltimeFormatted()} - Override successful!`);

    return Result.Success;
  } catch (err) {
    overrideLogger.error(
      `${getFulltimeFormatted()} - Error when moving built files - ${err}`
    );
    //Rollback
    try {
      fs.rmSync("../../../dist", { recursive: true, force: true });
      fs.renameSync("../../../dist2", "../../../dist");
      await exec("pnpm install", { cwd: "../../dist" });

      overrideLogger.info(
        `${getFulltimeFormatted()} - Override not successful BUT rollback successful`
      );

      return Result.Success;
    } catch (err) {
      overrideLogger.error(
        `${getFulltimeFormatted()} - Error when rollbacking - ${err}`
      );

      return Result.Error;
    }
  }
}

async function start() {
  try {
    await exec("pm2 delete index");
  } finally {
    // eslint-disable-next-line no-unsafe-finally
    return new Promise((resolve, reject) => {
      const pnpm = spawn("pnpm.cmd", ["start"], {
        cwd: "../../",
        detached: true,
      });

      pnpm.on("error", (err) => {
        return reject(err);
      });

      pnpm.on("close", (code) => {
        if (code === 0) {
          return resolve(code);
        } else {
          return reject(code);
        }
      });
    });
  }
}

module.exports = async function onStartup() {
  // Update
  const updateRes = await update();
  if (updateRes === UpdateResult.Updated || !fs.existsSync("../../../dist")) {
    // Build new
    const buildRes = await build();
    if (buildRes === Result.Success) {
      // Override old if success
      const overrideRes = await override();
      if (overrideRes === Result.Success) {
        overrideLogger.info(`${getFulltimeFormatted()} - Override success!`);
      } else if (overrideRes === Result.Error) {
        overrideLogger.error(`${getFulltimeFormatted()} - Override error`);
      }
    }
  }
  // Start application in production
  try {
    const code = await start();
    startLogger.info(
      `${getFulltimeFormatted()} - Start success (code ${code})`
    );
    return true;
  } catch (err) {
    startLogger.error(`${getFulltimeFormatted()} - Start error - ${err}`);
    for (let i = 0; i < 5; ++i) {
      try {
        await start();
        startLogger.info(
          `${getFulltimeFormatted()} - Start success on try number #${i}`
        );
        setTimeout(5000);
        return true;
      } catch (err) {
        // Do nothing, try again
        startLogger.error(
          `${getFulltimeFormatted()} - Start error on try number #${i} - ${err}`
        );
      }
    }
    return false;
  }
};
