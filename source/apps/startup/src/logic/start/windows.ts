import { promisify } from "util";
import { exec as execCallback, spawn, ChildProcess } from "child_process";
import fs from "fs-extra";
import winston from "winston";
import { getFulltimeFormatted } from "../../utils/time.js";
import { Result, ResultType, UpdateResult, UpdateResultType } from "../../types/results.js";

const exec = promisify(execCallback);

interface ExecResult {
  stdout: string;
  stderr: string;
}

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

async function update(): Promise<UpdateResultType> {
  try {
    const { stdout, stderr }: ExecResult = await exec("git pull", { cwd: "../../" });
    if (!stdout) {
      updateLogger.error(
        `${getFulltimeFormatted()} - stderror when updating (${stderr})`
      );
      return UpdateResult.Error;
    }
    if (stdout.toLowerCase().includes("already up to date")) {
      updateLogger.info(`${getFulltimeFormatted()} - Already up to date`);
      return UpdateResult.Unchanged;
    }
    updateLogger.info(`${getFulltimeFormatted()} - Update successful!`);
    return UpdateResult.Updated;
  } catch (err: unknown) {
    updateLogger.error(
      `${getFulltimeFormatted()} - Error when updating (${err})`
    );
    return UpdateResult.Error;
  }
}

async function build(): Promise<ResultType> {
  try {
    const { stderr }: ExecResult = await exec("pnpm run build", { cwd: "../../" });
    // Log stderr as warning if present (npm/pnpm often write warnings to stderr even on success)
    if (stderr) {
      buildLogger.warn(
        `${getFulltimeFormatted()} - Build warnings - ${stderr}`
      );
    }
    buildLogger.info(`${getFulltimeFormatted()} - Build successful!`);
    return Result.Success;
  } catch (err: unknown) {
    // Only treat as error if the command actually failed (exec throws on non-zero exit code)
    buildLogger.error(`${getFulltimeFormatted()} - Build error - ${err}`);
    return Result.Error;
  }
}

async function override(): Promise<ResultType> {
  // Rename dist to old
  const doesExistDist = fs.existsSync("../../../dist");
  if (doesExistDist) {
    const doesExistDist2 = fs.existsSync("../../../dist2");
    if (doesExistDist2) {
      try {
        fs.rmSync("../../../dist2", { recursive: true, force: true });
      } catch (err: unknown) {
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
    } catch (err: unknown) {
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
  } catch (err: unknown) {
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
    } catch (rollbackErr: unknown) {
      overrideLogger.error(
        `${getFulltimeFormatted()} - Error when rollbacking - ${rollbackErr}`
      );

      return Result.Error;
    }
  }
}

async function startConfiger(): Promise<number> {
  try {
    await exec("pm2 delete configer");
    // eslint-disable-next-line no-empty
  } catch (_err: unknown) {
    // Ignore - PM2 process may not exist
  }

  return new Promise<number>((resolve, reject) => {
    const pnpm: ChildProcess = spawn("pnpm.cmd", ["start:configer"], {
      cwd: "../../",
      detached: true,
    });

    pnpm.on("error", (err: Error) => {
      return reject("configer err - " + err);
    });

    pnpm.on("close", (code: number | null) => {
      if (code === 0) {
        return resolve(code);
      } else {
        return reject("configer err - " + code);
      }
    });
  });
}

async function start(): Promise<number> {
  try {
    await exec("pm2 delete babybox");
    // eslint-disable-next-line no-empty
  } catch (_err: unknown) {
    // Ignore - PM2 process may not exist
  }

  return new Promise<number>((resolve, reject) => {
    const pnpm: ChildProcess = spawn("pnpm.cmd", ["start:main"], {
      cwd: "../../",
      detached: true,
    });

    pnpm.on("error", (err: Error) => {
      return reject(err);
    });

    pnpm.on("close", (code: number | null) => {
      if (code === 0) {
        return resolve(code);
      } else {
        return reject(code);
      }
    });
  });
}

export default async function onStartup(): Promise<boolean> {
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
    const configerCode = await startConfiger();
    const mainCode = await start();
    startLogger.info(
      `${getFulltimeFormatted()} - Start success (code ${mainCode}, ${configerCode})`
    );
    return true;
  } catch (err: unknown) {
    startLogger.error(`${getFulltimeFormatted()} - Start error - ${err}`);
    for (let i = 0; i < 5; ++i) {
      try {
        await start();
        startLogger.info(
          `${getFulltimeFormatted()} - Start success on try number #${i}`
        );
        await new Promise(resolve => setTimeout(resolve, 5000));
        return true;
      } catch (retryErr: unknown) {
        // Do nothing, try again
        startLogger.error(
          `${getFulltimeFormatted()} - Start error on try number #${i} - ${retryErr}`
        );
      }
    }
    return false;
  }
}
