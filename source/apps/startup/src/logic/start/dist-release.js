// Assemble dist-next, then swap it into the live dist.
// The live dist stays in place until that new tree is complete.
// A failed start puts the previous dist back and starts both apps from it.
// Rollback install uses the repo dist directory, not source/dist.
// An already-current pull still builds when dist/release.json lacks HEAD.
// OS_HOLD and CPU_HOLD skip that build while the hold is still true.
// release.json is written only after START_PANEL succeeds.
// Bootstrap runs again before git pull, after the lockfile restore.

const childProcess = require("child_process");
const os = require("os");
const path = require("path");
const util = require("util");

const fs = require("fs-extra");

const bootstrap = require("../../../bootstrap");
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
    bun: pick(opts.bun, "bun"),
    exec: pick(opts.exec, util.promisify(childProcess.exec)),
    spawn: pick(opts.spawn, childProcess.spawn),
    fs: pick(opts.fs, fs),
    logger: pick(opts.logger, logger),
    logPath: pick(opts.logPath, LOG_PATH),
    now: pick(opts.now, () => new Date()),
    versions: opts.versions,
    env: pick(opts.env, process.env),
    home: pick(opts.home, os.homedir()),
    release: pick(opts.release, os.release()),
    arch: pick(opts.arch, process.arch),
    bootstrapRun: pick(opts.bootstrapRun, bootstrap.run),
    bootstrapSpawn: opts.bootstrapSpawn,
    httpsGet: opts.httpsGet,
    headSha: opts.headSha,
    bunVersion: opts.bunVersion,
    wantedBun: opts.wantedBun,
    versionsPath: pick(
      opts.versionsPath,
      path.join(__dirname, "../../../versions.env")
    ),
    spawnSync: pick(opts.spawnSync, childProcess.spawnSync),
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
      bunLock: path.join(repoRoot, "source", "bun.lock"),
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

function lastPath(ctx) {
  return path.join(path.dirname(ctx.logPath), "startup.last.json");
}

function readLast(ctx) {
  try {
    const record = JSON.parse(fs.readFileSync(lastPath(ctx), "utf8"));
    if (!record || typeof record.step !== "string") {
      return null;
    }
    return record;
  } catch (err) {
    return null;
  }
}

function cpuHoldFile(ctx) {
  return path.join(ctx.home, ".bun", "cpu-hold");
}

function readCpuHold(ctx) {
  try {
    if (!fs.existsSync(cpuHoldFile(ctx))) {
      return "";
    }
    return fs.readFileSync(cpuHoldFile(ctx), "utf8").trim();
  } catch (err) {
    return "";
  }
}

function wantedBun(ctx) {
  if (ctx.wantedBun !== undefined && ctx.wantedBun !== null) {
    return String(ctx.wantedBun).trim();
  }
  try {
    const parsed = bootstrap.readVersions(
      fs.readFileSync(ctx.versionsPath, "utf8")
    );
    return parsed.BUN_VERSION || "";
  } catch (err) {
    return "";
  }
}

function firstLine(value) {
  const text = value === undefined || value === null ? "" : String(value);
  return text.split(/\r?\n/)[0].trim();
}

function installedBunVersion(ctx) {
  if (ctx.bunVersion !== undefined && ctx.bunVersion !== null) {
    return String(ctx.bunVersion).trim();
  }
  const exeName = ctx.platform === "win32" ? "bun.exe" : "bun";
  const exePath = path.join(ctx.home, ".bun", "bin", exeName);
  if (!fs.existsSync(exePath)) {
    return "";
  }
  try {
    const result = ctx.spawnSync(exePath, ["-v"], {
      env: ctx.env,
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    if (!result || result.status !== 0) {
      return "";
    }
    return firstLine(result.stdout);
  } catch (err) {
    return "";
  }
}

function bunMatches(ctx) {
  const wanted = wantedBun(ctx);
  const have = installedBunVersion(ctx);
  if (wanted === "") {
    return false;
  }
  if (have === wanted || have === `v${wanted}`) {
    return true;
  }
  return false;
}

function releasePath(ctx) {
  return path.join(ctx.paths.dist, "release.json");
}

function releaseHasSha(ctx, sha) {
  if (!sha) {
    return false;
  }
  try {
    if (!ctx.fs.existsSync(releasePath(ctx))) {
      return false;
    }
    return String(ctx.fs.readFileSync(releasePath(ctx), "utf8")).indexOf(sha) !== -1;
  } catch (err) {
    return false;
  }
}

function writeRelease(ctx, sha) {
  if (!sha) {
    throw new Error(strings.releaseWriteFailed);
  }
  ctx.fs.writeFileSync(releasePath(ctx), `${JSON.stringify({ sha })}\n`);
}

// The file bootstrap wrote must name this pin. A new BUN_VERSION builds again.
function stillOnHold(ctx) {
  const record = readLast(ctx);
  if (!record || record.ok !== true) {
    return false;
  }
  if (record.step === "OS_HOLD") {
    return bootstrap.isOsHold(ctx.platform, ctx.release);
  }
  if (record.step === "CPU_HOLD") {
    const wanted = wantedBun(ctx);
    const pinned = readCpuHold(ctx);
    return wanted !== "" && pinned === wanted;
  }
  return false;
}

function needsBuild(ctx, previous, updateRes, boot, sha) {
  if (updateRes === UPDATE_CHANGED) {
    return true;
  }
  if (!ctx.fs.existsSync(ctx.paths.dist)) {
    return true;
  }
  if (!releaseHasSha(ctx, sha)) {
    return true;
  }
  if (!bunMatches(ctx)) {
    return true;
  }
  if (
    previous &&
    previous.ok === false &&
    previous.step !== "OS_HOLD" &&
    previous.step !== "CPU_HOLD"
  ) {
    return true;
  }
  if (boot.code !== 0) {
    return true;
  }
  if (ctx.requireConfigerBuild && !ctx.fs.existsSync(ctx.paths.configerDist)) {
    return true;
  }
  return false;
}

async function git(ctx, command) {
  return ctx.exec(command, { cwd: ctx.paths.source });
}

async function prepareTree(ctx) {
  try {
    await git(ctx, "git checkout -- pnpm-lock.yaml");
  } catch (err) {
    remember(ctx, "PULL", false, errorText(err));
    return false;
  }
  try {
    const result = await git(ctx, "git status --porcelain");
    const dirty = String(result.stdout || "").trim();
    if (dirty !== "") {
      remember(ctx, "PULL", false, `${strings.treeDirty} ${dirty}`);
      return false;
    }
  } catch (err) {
    remember(ctx, "PULL", false, errorText(err));
    return false;
  }
  return true;
}

function holdStep(text) {
  if (text.indexOf("Krok OS_HOLD") !== -1) {
    return "OS_HOLD";
  }
  if (text.indexOf("Krok CPU_HOLD") !== -1) {
    return "CPU_HOLD";
  }
  return "";
}

function bootstrapOptions(ctx, stdout) {
  const built = {
    env: ctx.env,
    stdout,
    logPath: ctx.logPath,
    now: ctx.now,
    platform: ctx.platform,
    arch: ctx.arch,
    release: ctx.release,
    home: ctx.home,
    versionsPath: ctx.versionsPath,
  };
  if (ctx.bootstrapSpawn !== undefined) {
    built.spawnSync = ctx.bootstrapSpawn;
  }
  if (ctx.httpsGet !== undefined) {
    built.httpsGet = ctx.httpsGet;
  }
  if (ctx.versions !== undefined) {
    built.versions = ctx.versions;
  }
  return built;
}

async function bootstrapBeforePull(ctx) {
  begin(ctx, "BOOTSTRAP_BUN");
  let text = "";
  const stdout = {
    write(chunk) {
      text += String(chunk);
      return true;
    },
  };
  let code;
  try {
    code = await ctx.bootstrapRun(bootstrapOptions(ctx, stdout));
  } catch (err) {
    fail(ctx, "BOOTSTRAP_BUN", err);
    return { code: 1, hold: false };
  }
  if (typeof code !== "number") {
    code = 1;
  }
  if (code !== 0) {
    const hold = holdStep(text);
    if (hold !== "") {
      const current = readLast(ctx);
      if (!current || current.step !== hold) {
        remember(ctx, hold, true, text);
      }
      return { code, hold: true };
    }
    const err = new Error(strings.stepFailed.replace("{step}", "BOOTSTRAP_BUN"));
    err.stderr = text;
    fail(ctx, "BOOTSTRAP_BUN", err);
    return { code, hold: false };
  }
  succeed(ctx, "BOOTSTRAP_BUN", text);
  return { code: 0, hold: false };
}

async function headSha(ctx) {
  if (ctx.headSha !== undefined && ctx.headSha !== null) {
    return String(ctx.headSha).trim();
  }
  const result = await git(ctx, "git rev-parse HEAD");
  return String(result.stdout || "").trim();
}

async function startPrevious(ctx) {
  if (ctx.fs.existsSync(ctx.paths.dist)) {
    return startLive(ctx);
  }
  return false;
}

async function build(ctx) {
  try {
    const { stderr, stdout } = await ctx.exec(`${ctx.pnpm} run build`, {
      cwd: ctx.paths.source,
      maxBuffer: 32 * 1024 * 1024,
    });
    // The old startup fails the update on any build stderr.
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
    fileSystem.copyFileSync(
      ctx.paths.bunLock,
      path.join(ctx.paths.distNext, "bun.lock")
    );
    // Install here, before any rename of the live dist.
    // --no-save keeps the copied lock and writes nothing on stderr.
    await ctx.exec(`${ctx.bun} install --no-save`, {
      cwd: ctx.paths.distNext,
      maxBuffer: 32 * 1024 * 1024,
    });
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

function dropNodeModules(fileSystem, dir) {
  const modules = path.join(dir, "node_modules");
  if (fileSystem.existsSync(modules)) {
    // node_modules is read-only on Windows and blocks rename.
    fileSystem.rmSync(modules, { maxRetries: 3, recursive: true });
  }
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
      dropNodeModules(fileSystem, ctx.paths.dist);
      fileSystem.renameSync(ctx.paths.dist, ctx.paths.dist2);
    }
    dropNodeModules(fileSystem, ctx.paths.distNext);
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

// Does not write a success record, so a failed upgrade stays visible for the next boot.
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
    try {
      writeRelease(ctx, await headSha(ctx));
    } catch (err) {
      // The panel is up. A missing sha makes the next boot build again.
      ctx.logger.error("START_PANEL", strings.releaseWriteFailed, err);
    }
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
      dropNodeModules(fileSystem, ctx.paths.dist);
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
    // --no-save keeps the copied lock and writes nothing on stderr.
    await ctx.exec(`${ctx.bun} install --no-save`, {
      cwd: ctx.paths.dist,
      maxBuffer: 32 * 1024 * 1024,
    });
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
  const previous = readLast(ctx);
  const ready = await prepareTree(ctx);
  if (!ready) {
    return startPrevious(ctx);
  }
  const boot = await bootstrapBeforePull(ctx);
  const updateRes = await update(ctx);
  if (stillOnHold(ctx)) {
    return startPrevious(ctx);
  }
  if (updateRes === UPDATE_ERROR) {
    return startPrevious(ctx);
  }
  let sha = "";
  try {
    sha = await headSha(ctx);
  } catch (err) {
    sha = "";
  }
  if (needsBuild(ctx, previous, updateRes, boot, sha)) {
    const built = await build(ctx);
    if (!built) {
      return startPrevious(ctx);
    }
    return runRelease(ctx);
  }
  return startLive(ctx);
}

module.exports = {
  onStartup,
};
