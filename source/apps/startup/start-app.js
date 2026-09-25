/*
 * Starts configer or the panel backend under pm2. Node 12 syntax. No packages.
 * On boot 1 the old startup runs the root start scripts without ~/.bun/bin
 * on PATH, so pm2 gets the absolute Bun path.
 * A box that cannot run Bun starts the same files on Node.
 */

const childProcess = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const bootstrap = require("./bootstrap");

const SOURCE_DIR = path.resolve(__dirname, "../..");
const PROBE_TIMEOUT_MS = 30000;

const REASONS = {
  OS_HOLD: "systém je v OS_HOLD",
  CPU_HOLD: "procesor je v CPU_HOLD",
  MISSING: "Bun chybí",
  PROBE: "Bun nejde spustit",
};

function pick(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }
  return value;
}

function appSpec(name, sourceDir) {
  if (name === "configer") {
    return {
      pm2Name: "configer",
      cwd: path.join(sourceDir, "apps", "configer"),
      script: "./dist/index.js",
      install: false,
    };
  }
  if (name === "main") {
    return {
      pm2Name: "babybox",
      cwd: path.resolve(sourceDir, "..", "dist"),
      script: "../dist/index.js",
      install: true,
    };
  }
  return null;
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (err) {
    return "";
  }
}

function firstLine(value) {
  const text = value === undefined || value === null ? "" : String(value);
  return text.split(/\r?\n/)[0].trim();
}

function onNode(reason, wanted) {
  return { bun: "", version: "", wanted, reason };
}

/*
 * A Bun that answers -v with another version still runs the apps.
 * bootstrap keeps the old binary when a new pin fails to download,
 * and that binary ran the last good dist.
 */
function chooseRuntime(run) {
  if (bootstrap.isOsHold(run.platform, run.release)) {
    return onNode("OS_HOLD", "");
  }
  const exeName = run.platform === "win32" ? "bun.exe" : "bun";
  const exe = path.join(run.home, ".bun", "bin", exeName);
  if (!fs.existsSync(exe)) {
    return onNode("MISSING", "");
  }
  const wanted =
    bootstrap.readVersions(readText(run.versionsPath)).BUN_VERSION || "";
  // A CPU_HOLD box keeps the binary that traps. cpu-hold names its pin.
  const hold = readText(path.join(run.home, ".bun", "cpu-hold")).trim();
  if (hold !== "" && hold === wanted) {
    return onNode("CPU_HOLD", wanted);
  }
  let result = null;
  try {
    result = run.spawnSync(exe, ["-v"], {
      env: run.env,
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      timeout: PROBE_TIMEOUT_MS,
    });
  } catch (err) {
    result = null;
  }
  const version = result ? firstLine(result.stdout) : "";
  if (!result || result.error || result.status !== 0 || version === "") {
    return onNode("PROBE", wanted);
  }
  return { bun: exe, version, wanted, reason: "" };
}

function exitCode(result) {
  if (result && typeof result.status === "number") {
    return result.status;
  }
  return 1;
}

function pm2Args(spec, runtime) {
  const args = ["start", spec.script, "-n", spec.pm2Name];
  if (runtime.bun !== "") {
    args.push("--interpreter", runtime.bun);
  }
  return args;
}

function runPm2(run, args, cwd) {
  let result;
  try {
    if (run.platform === "win32") {
      // pm2 is a .cmd shim. Quotes keep a path with spaces whole.
      const line = ["pm2"].concat(args.map((arg) => `"${arg}"`)).join(" ");
      result = run.spawnSync(line, [], {
        cwd,
        env: run.env,
        stdio: "inherit",
        windowsHide: true,
        shell: true,
      });
    } else {
      result = run.spawnSync("pm2", args, {
        cwd,
        env: run.env,
        stdio: "inherit",
        shell: false,
      });
    }
  } catch (err) {
    result = { status: null, error: err };
  }
  if (result && result.error) {
    run.stdout.write(`pm2 nejde spustit. ${result.error.message}\n`);
  }
  return result;
}

function installDist(run, runtime, cwd) {
  try {
    // --no-save keeps the copied lock and writes nothing on stderr.
    return run.spawnSync(runtime.bun, ["install", "--no-save"], {
      cwd,
      env: run.env,
      stdio: "inherit",
      windowsHide: true,
      shell: false,
    });
  } catch (err) {
    return { status: null, error: err };
  }
}

function start(name, options) {
  const opts = options || {};
  const run = {
    platform: pick(opts.platform, process.platform),
    release: pick(opts.release, os.release()),
    home: pick(opts.home, os.homedir()),
    versionsPath: pick(opts.versionsPath, path.join(__dirname, "versions.env")),
    spawnSync: pick(opts.spawnSync, childProcess.spawnSync),
    stdout: pick(opts.stdout, process.stdout),
    env: Object.assign({}, pick(opts.env, process.env)),
  };
  const spec = appSpec(name, pick(opts.sourceDir, SOURCE_DIR));
  if (spec === null) {
    run.stdout.write(`Neznámá aplikace ${name}.\n`);
    return 1;
  }
  if (!fs.existsSync(spec.cwd)) {
    run.stdout.write(`Adresář ${spec.cwd} chybí.\n`);
    return 1;
  }
  const runtime = chooseRuntime(run);
  if (runtime.bun !== "") {
    // The app's GET /status runs bun -v from PATH.
    bootstrap.prependPath(run.env, path.dirname(runtime.bun));
    const other =
      runtime.wanted !== "" &&
      runtime.version !== runtime.wanted &&
      runtime.version !== `v${runtime.wanted}`;
    const note = other ? ` Chceme ${runtime.wanted}.` : "";
    run.stdout.write(
      `Spouštím ${spec.pm2Name} na Bun ${runtime.version} (${runtime.bun}).${note}\n`
    );
  } else {
    run.stdout.write(
      `Spouštím ${spec.pm2Name} na Node, ${REASONS[runtime.reason]}.\n`
    );
  }
  if (spec.install && !fs.existsSync(path.join(spec.cwd, "node_modules"))) {
    if (runtime.bun === "") {
      run.stdout.write("Balíčky v dist chybí a Bun nejde spustit.\n");
      return 1;
    }
    const installed = installDist(run, runtime, spec.cwd);
    if (exitCode(installed) !== 0) {
      return exitCode(installed);
    }
  }
  return exitCode(runPm2(run, pm2Args(spec, runtime), spec.cwd));
}

if (require.main === module) {
  process.exitCode = start(process.argv[2]);
}

module.exports = {
  chooseRuntime,
  start,
};
