const util = require("util");
const exec = util.promisify(require("child_process").exec);
const spawn = require("child_process").spawn;
const fs = require("fs-extra");
const logger = require("../../logger");
const strings = require("../../strings");

const Result = {
  Error: "ResultError",
  Success: "ResultSuccess",
};

const UpdateResult = {
  Error: "UpdateError",
  Updated: "UpdateSuccess",
  Unchanged: "UpdateUnchanged",
};

function withRetryIndex(template, index) {
  return template.replace("{n}", String(index));
}

function collectStdio(child) {
  const chunks = [];
  const append = (data) => {
    chunks.push(Buffer.isBuffer(data) ? data.toString("utf8") : String(data));
  };
  if (child.stdout) {
    child.stdout.on("data", append);
  }
  if (child.stderr) {
    child.stderr.on("data", append);
  }
  return () => chunks.join("");
}

async function update() {
  try {
    const { stdout, stderr } = await exec("git pull", { cwd: "../../" });
    if (!stdout) {
      const err = new Error(strings.updateFailed);
      err.stderr = stderr;
      logger.error("update", strings.updateFailed, err);
      return UpdateResult.Error;
    }
    if (stdout.toLowerCase().includes("already up to date")) {
      logger.info("update", strings.updateAlreadyCurrent);
      return UpdateResult.Unchanged;
    }
    logger.info("update", strings.updateSucceeded);
    return UpdateResult.Updated;
  } catch (err) {
    logger.error("update", strings.updateFailed, err);
    return UpdateResult.Error;
  }
}

async function build() {
  try {
    const { stderr, stdout } = await exec("pnpm run build", { cwd: "../../" });
    if (stderr) {
      const err = new Error(strings.buildFailed);
      err.stderr = stderr;
      err.stdout = stdout;
      logger.error("build", strings.buildFailed, err);
      return Result.Error;
    }
    logger.info("build", strings.buildSucceeded);
    return Result.Success;
  } catch (err) {
    logger.error("build", strings.buildFailed, err);
    return Result.Error;
  }
}

async function override() {
  const doesExistDist = fs.existsSync("../../../dist");
  if (doesExistDist) {
    const doesExistDist2 = fs.existsSync("../../../dist2");
    if (doesExistDist2) {
      try {
        fs.rmSync("../../../dist2", { recursive: true, force: true });
      } catch (err) {
        logger.error("override", strings.overrideRemoveDist2Failed, err);
        return Result.Error;
      }
    }
    try {
      if (fs.existsSync("../../../dist/node_modules")) {
        fs.rmSync("../../../dist/node_modules", {
          maxRetries: 3,
          recursive: true,
        });
      }
      fs.renameSync("../../../dist", "../../../dist2");
    } catch (err) {
      logger.error("override", strings.overrideRenameFailed, err);
      return Result.Error;
    }
  }
  const doesExistBuild =
    fs.existsSync("../backend/dist") && fs.existsSync("../panel/dist");
  if (!doesExistBuild) {
    await build();
  }

  try {
    fs.copySync("../backend/dist", "../../../dist");
    fs.copySync("../panel/dist", "../../../dist/public");
    fs.copyFileSync("../backend/.env", "../../../dist/.env");
    fs.copyFileSync("../backend/package.json", "../../../dist/package.json");
    await exec("pnpm install", { cwd: "../../../dist" });

    logger.info("override", strings.overrideSucceeded);

    return Result.Success;
  } catch (err) {
    logger.error("override", strings.overrideCopyFailed, err);
    try {
      fs.rmSync("../../../dist", { recursive: true, force: true });
      fs.renameSync("../../../dist2", "../../../dist");
      await exec("pnpm install", { cwd: "../../dist" });

      logger.warn("override", strings.overrideRollbackSucceeded);

      return Result.Success;
    } catch (rollbackErr) {
      logger.error("override", strings.overrideRollbackFailed, rollbackErr);

      return Result.Error;
    }
  }
}

async function startConfiger() {
  try {
    await exec("pm2 delete configer");
    // eslint-disable-next-line no-empty
  } catch (err) {}

  return new Promise((resolve, reject) => {
    const pnpm = spawn("pnpm.cmd", ["start:configer"], {
      cwd: "../../",
      detached: true,
    });
    const readStdio = collectStdio(pnpm);
    let settled = false;

    pnpm.on("error", (err) => {
      if (settled) {
        return;
      }
      settled = true;
      err.stderr = readStdio();
      logger.error("start", strings.startConfigerFailed, err);
      return reject(err);
    });

    pnpm.on("close", (code) => {
      if (settled) {
        return;
      }
      settled = true;
      if (code === 0) {
        return resolve(code);
      }
      const err = new Error(`configer err - ${code}`);
      err.stderr = readStdio();
      logger.error("start", strings.startConfigerFailed, err);
      return reject(err);
    });
  });
}

async function start() {
  try {
    await exec("pm2 delete babybox");
    // eslint-disable-next-line no-empty
  } catch (err) {}

  return new Promise((resolve, reject) => {
    const pnpm = spawn("pnpm.cmd", ["start:main"], {
      cwd: "../../",
      detached: true,
    });
    const readStdio = collectStdio(pnpm);

    pnpm.on("error", (err) => {
      err.stderr = readStdio();
      return reject(err);
    });

    pnpm.on("close", (code) => {
      if (code === 0) {
        return resolve(code);
      }
      const err = new Error(String(code));
      err.stderr = readStdio();
      return reject(err);
    });
  });
}

module.exports = async function onStartup() {
  const updateRes = await update();
  if (updateRes === UpdateResult.Updated || !fs.existsSync("../../../dist")) {
    const buildRes = await build();
    if (buildRes === Result.Success) {
      await override();
    }
  }
  try {
    await startConfiger();
    await start();
    return true;
  } catch (err) {
    logger.error("start", strings.startFailed, err);
    for (let i = 0; i < 5; ++i) {
      try {
        await start();
        logger.info("start", withRetryIndex(strings.startRetrySucceeded, i + 1));
        setTimeout(5000);
        return true;
      } catch (retryErr) {
        logger.error(
          "start",
          withRetryIndex(strings.startRetryFailed, i + 1),
          retryErr
        );
      }
    }
    return false;
  }
};
