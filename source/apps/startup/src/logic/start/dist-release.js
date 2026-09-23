// Assemble dist-next, then swap it into the live dist.
// The live dist stays in place until that new tree is complete.
// A failed start puts the previous dist back and starts both apps from it.
// Rollback install uses the repo dist directory, not source/dist.

const childProcess = require("child_process");
const path = require("path");
const util = require("util");

const fs = require("fs-extra");

const lastRecord = require("../../../last-record");
const logger = require("../../logger");
const strings = require("../../strings");

const UPDATE_ERROR = "error";
const UPDATE_CHANGED = "changed";
const UPDATE_CURRENT = "current";

const REPO_ROOT = path.resolve(__dirname, "../../../../../..");
const LOG_PATH = path.resolve(__dirname, "../../../../../logs/startup.log");

function pick(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }
  return value;
}

function stepText(template, step) {
  return template.replace("{step}", step);
}

function createContext(options) {
  const opts = options || {};
  const repoRoot = pick(opts.repoRoot, REPO_ROOT);
  const platform = pick(opts.platform, process.platform);
  return {
    repoRoot,
    platform,
    pnpm: pick(opts.pnpm, platform === "win32" ? "pnpm.cmd" : "pnpm"),
    exec: pick(opts.exec, util.promisify(childProcess.exec)),
    spawn: pick(opts.spawn, childProcess.spawn),
    fs: pick(opts.fs, fs),
    logger: pick(opts.logger, logger),
    logPath: pick(opts.logPath, LOG_PATH),
    now: pick(opts.now, () => new Date()),
    versions: opts.versions,
    env: pick(opts.env, process.env),
    requireConfigerBuild: opts.requireConfigerBuild === true,
    paths: {
      source: path.join(repoRoot, "source"),
      dist: path.join(repoRoot, "dist"),
      dist2: path.join(repoRoot, "dist2"),
      distNext: path.join(repoRoot, "dist-next"),
      backendDist: path.join(repoRoot, "source", "apps", "backend", "dist"),
      panelDist: path.join(repoRoot, "source", "apps", "panel", "dist"),
      configerDist: path.join(repoRoot, "source", "apps", "configer", "dist"),
      backendEnv: path.join(repoRoot, "source", "apps", "backend", ".env"),
      backendPackage: path.join(
        repoRoot,
        "source",
        "apps",
        "backend",
        "package.json"
      ),
    },
  };
}

function say(ctx, level, step, template, err) {
  ctx.logger[level](step, stepText(template, step), err);
}

function versionsOf(ctx) {
  return lastRecord.resolveVersions(
    ctx.versions,
    childProcess.spawnSync,
    ctx.env,
    ctx.platform
  );
}

function errorText(err) {
  if (err === undefined || err === null) {
    return "";
  }
  let stderr = "";
  if (err.stderr !== undefined && err.stderr !== null && err.stderr !== "") {
    stderr = err.stderr;
  } else if (err.message) {
    stderr = err.message;
  }
  return lastRecord.commandMessage(stderr, err.stdout);
}

function remember(ctx, step, ok, message) {
  lastRecord.writeRecord(
    ctx.logPath,
    lastRecord.buildRecord(step, ok, message, ctx.now(), versionsOf(ctx))
  );
}

function begin(ctx, step) {
  say(ctx, "info", step, strings.stepStarted);
}

function end(ctx, step) {
  say(ctx, "info", step, strings.stepFinished);
}

function fail(ctx, step, err) {
  say(ctx, "error", step, strings.stepFailed, err);
  remember(ctx, step, false, errorText(err));
}

function succeed(ctx, step, output) {
  end(ctx, step);
  remember(ctx, step, true, lastRecord.commandMessage("", output || ""));
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

async function update(ctx) {
  try {
    const { stdout, stderr } = await ctx.exec("git pull", {
      cwd: ctx.paths.source,
    });
    if (!stdout) {
      const err = new Error(strings.updateFailed);
      err.stderr = stderr;
      ctx.logger.error("update", strings.updateFailed, err);
      return UPDATE_ERROR;
    }
    if (stdout.toLowerCase().indexOf("already up to date") !== -1) {
      ctx.logger.info("update", strings.updateAlreadyCurrent);
      return UPDATE_CURRENT;
    }
    ctx.logger.info("update", strings.updateSucceeded);
    return UPDATE_CHANGED;
  } catch (err) {
    ctx.logger.error("update", strings.updateFailed, err);
    return UPDATE_ERROR;
  }
}

async function build(ctx) {
  try {
    const { stderr, stdout } = await ctx.exec(`${ctx.pnpm} run build`, {
      cwd: ctx.paths.source,
    });
    if (stderr) {
      const err = new Error(strings.buildFailed);
      err.stderr = stderr;
      err.stdout = stdout;
      ctx.logger.error("build", strings.buildFailed, err);
      return false;
    }
    ctx.logger.info("build", strings.buildSucceeded);
    return true;
  } catch (err) {
    ctx.logger.error("build", strings.buildFailed, err);
    return false;
  }
}

async function assembleDistNext(ctx) {
  const fileSystem = ctx.fs;
  begin(ctx, "DIST_PREPARE");
  if (
    !fileSystem.existsSync(ctx.paths.backendDist) ||
    !fileSystem.existsSync(ctx.paths.panelDist)
  ) {
    fail(ctx, "DIST_PREPARE", new Error(strings.distNextMissingBuild));
    return false;
  }
  try {
    fileSystem.rmSync(ctx.paths.distNext, { recursive: true, force: true });
    fileSystem.copySync(ctx.paths.backendDist, ctx.paths.distNext);
    fileSystem.copySync(
      ctx.paths.panelDist,
      path.join(ctx.paths.distNext, "public")
    );
    fileSystem.copyFileSync(
      ctx.paths.backendEnv,
      path.join(ctx.paths.distNext, ".env")
    );
    fileSystem.copyFileSync(
      ctx.paths.backendPackage,
      path.join(ctx.paths.distNext, "package.json")
    );
    // Install here, before any rename of the live dist.
    await ctx.exec(`${ctx.pnpm} install`, { cwd: ctx.paths.distNext });
  } catch (err) {
    try {
      fileSystem.rmSync(ctx.paths.distNext, { recursive: true, force: true });
    } catch {
      // A leftover dist-next is not the live tree.
    }
    fail(ctx, "DIST_PREPARE", err);
    return false;
  }
  end(ctx, "DIST_PREPARE");
  return true;
}

async function stopPm2(ctx) {
  try {
    await ctx.exec("pm2 delete configer");
  } catch {
    // The process is already gone.
  }
  try {
    await ctx.exec("pm2 delete babybox");
  } catch {
    // The process is already gone.
  }
}

async function swapIn(ctx) {
  const fileSystem = ctx.fs;
  const hadLive = fileSystem.existsSync(ctx.paths.dist);
  begin(ctx, "SWAP");
  try {
    await stopPm2(ctx);
    if (fileSystem.existsSync(ctx.paths.dist2)) {
      fileSystem.rmSync(ctx.paths.dist2, { recursive: true, force: true });
    }
    if (hadLive) {
      const modules = path.join(ctx.paths.dist, "node_modules");
      if (fileSystem.existsSync(modules)) {
        // node_modules is read-only on Windows and blocks rename.
        fileSystem.rmSync(modules, { maxRetries: 3, recursive: true });
      }
      fileSystem.renameSync(ctx.paths.dist, ctx.paths.dist2);
    }
    fileSystem.renameSync(ctx.paths.distNext, ctx.paths.dist);
  } catch (err) {
    if (
      hadLive &&
      !fileSystem.existsSync(ctx.paths.dist) &&
      fileSystem.existsSync(ctx.paths.dist2)
    ) {
      try {
        fileSystem.renameSync(ctx.paths.dist2, ctx.paths.dist);
      } catch (restoreErr) {
        ctx.logger.error("SWAP", strings.overrideRollbackFailed, restoreErr);
      }
    }
    fail(ctx, "SWAP", err);
    return false;
  }
  end(ctx, "SWAP");
  return true;
}

function startOne(ctx, script) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = ctx.spawn(ctx.pnpm, [script], {
        cwd: ctx.paths.source,
        detached: true,
        shell: false,
        windowsHide: true,
      });
    } catch (err) {
      reject(err);
      return;
    }
    const readStdio = collectStdio(child);
    let settled = false;

    function finish(fn) {
      if (settled) {
        return;
      }
      settled = true;
      fn();
    }

    child.on("error", (err) => {
      finish(() => {
        err.stderr = readStdio();
        reject(err);
      });
    });

    child.on("close", (code) => {
      finish(() => {
        const output = readStdio();
        if (code === 0) {
          resolve(output);
          return;
        }
        const err = new Error(`${script} ${code}`);
        err.stderr = output;
        reject(err);
      });
    });
  });
}

// Starts the tree that is already at dist. Does not write a success record,
// so a failed upgrade stays visible for the next boot.
async function startLive(ctx) {
  await stopPm2(ctx);
  let ok = true;
  try {
    begin(ctx, "START_CONFIGER");
    await startOne(ctx, "start:configer");
    end(ctx, "START_CONFIGER");
  } catch (err) {
    ctx.logger.error("start", strings.startConfigerFailed, err);
    ok = false;
  }
  try {
    begin(ctx, "START_PANEL");
    await startOne(ctx, "start:main");
    end(ctx, "START_PANEL");
  } catch (err) {
    ctx.logger.error("start", strings.startFailed, err);
    ok = false;
  }
  return ok;
}

async function startNew(ctx) {
  try {
    begin(ctx, "START_CONFIGER");
    await startOne(ctx, "start:configer");
    end(ctx, "START_CONFIGER");
  } catch (err) {
    fail(ctx, "START_CONFIGER", err);
    return "START_CONFIGER";
  }
  try {
    begin(ctx, "START_PANEL");
    const output = await startOne(ctx, "start:main");
    succeed(ctx, "START_PANEL", output);
    return "";
  } catch (err) {
    fail(ctx, "START_PANEL", err);
    return "START_PANEL";
  }
}

async function swapBack(ctx) {
  const fileSystem = ctx.fs;
  if (!fileSystem.existsSync(ctx.paths.dist2)) {
    return false;
  }
  try {
    fileSystem.rmSync(ctx.paths.distNext, { recursive: true, force: true });
    if (fileSystem.existsSync(ctx.paths.dist)) {
      fileSystem.renameSync(ctx.paths.dist, ctx.paths.distNext);
    }
    fileSystem.renameSync(ctx.paths.dist2, ctx.paths.dist);
  } catch (err) {
    if (
      !fileSystem.existsSync(ctx.paths.dist) &&
      fileSystem.existsSync(ctx.paths.distNext)
    ) {
      try {
        fileSystem.renameSync(ctx.paths.distNext, ctx.paths.dist);
      } catch (restoreErr) {
        ctx.logger.error("SWAP", strings.overrideRollbackFailed, restoreErr);
      }
    }
    ctx.logger.error("SWAP", strings.overrideRollbackFailed, err);
    return false;
  }
  try {
    fileSystem.rmSync(ctx.paths.distNext, { recursive: true, force: true });
  } catch (err) {
    ctx.logger.error("SWAP", strings.overrideRollbackFailed, err);
  }
  try {
    // Repo dist, the same directory the copy used. Not source/dist.
    await ctx.exec(`${ctx.pnpm} install`, { cwd: ctx.paths.dist });
  } catch (err) {
    ctx.logger.error("SWAP", strings.overrideRollbackFailed, err);
  }
  return true;
}

async function runRelease(ctx) {
  const prepared = await assembleDistNext(ctx);
  if (!prepared) {
    if (ctx.fs.existsSync(ctx.paths.dist)) {
      return startLive(ctx);
    }
    return false;
  }
  const swapped = await swapIn(ctx);
  if (!swapped) {
    if (ctx.fs.existsSync(ctx.paths.dist)) {
      return startLive(ctx);
    }
    return false;
  }
  const failedStep = await startNew(ctx);
  if (failedStep === "") {
    return true;
  }
  await stopPm2(ctx);
  if (!ctx.fs.existsSync(ctx.paths.dist2)) {
    return false;
  }
  const restored = await swapBack(ctx);
  if (!restored) {
    return false;
  }
  return startLive(ctx);
}

async function onStartup(options) {
  const ctx = createContext(options);
  const updateRes = await update(ctx);
  const distMissing = !ctx.fs.existsSync(ctx.paths.dist);
  const configerMissing =
    ctx.requireConfigerBuild && !ctx.fs.existsSync(ctx.paths.configerDist);
  if (updateRes === UPDATE_CHANGED || distMissing || configerMissing) {
    const built = await build(ctx);
    if (!built) {
      if (ctx.fs.existsSync(ctx.paths.dist)) {
        return startLive(ctx);
      }
      return false;
    }
    return runRelease(ctx);
  }
  return startLive(ctx);
}

module.exports = {
  onStartup,
};
