// The legacy startup runs `pnpm run build`. This file is that script.
// Node 12 syntax. Stderr stays empty on OS_HOLD.
// DIST_PREPARE, SWAP, and the start steps stay in the startup app.

const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

const bootstrap = require("./bootstrap");
const lastRecord = require("./last-record");

const STEPS = [
  { step: "INSTALL", args: ["install"] },
  { step: "BUILD_SCHEMA", args: ["run", "build:schema"] },
  { step: "BUILD_PANEL", args: ["-F", "babybox-panel", "build"] },
  { step: "BUILD_BACKEND", args: ["-F", "babybox-panel-backend", "build"] },
  { step: "BUILD_CONFIGER", args: ["-F", "babybox-panel-configer", "build"] },
];

function pad2(value) {
  const text = String(value);
  if (text.length < 2) {
    return `0${text}`;
  }
  return text;
}

function formatLine(date, level, message) {
  const stamp =
    `${pad2(date.getDate())}.${pad2(
      date.getMonth() + 1
    )}.${date.getFullYear()} ` +
    `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(
      date.getSeconds()
    )}`;
  return `${stamp} ${level} [run-update] ${message}\n`;
}

function pick(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }
  return value;
}

function writeLine(state, level, message) {
  const line = formatLine(state.now(), level, message);
  state.stdout.write(line);
  try {
    fs.mkdirSync(path.dirname(state.logPath), { recursive: true });
    fs.appendFileSync(state.logPath, line);
  } catch (err) {
    // The console line is enough when the log directory is not writable.
  }
}

function captureStdout(stdout) {
  let text = "";
  return {
    stream: {
      write(chunk) {
        text += String(chunk);
        return stdout.write(chunk);
      },
    },
    text() {
      return text;
    },
  };
}

// A hold and a failure both return 1.
function isHoldText(text) {
  if (text.indexOf("Krok OS_HOLD") !== -1) {
    return true;
  }
  return text.indexOf("Krok CPU_HOLD") !== -1;
}

function asText(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

function pnpmCommand(platform) {
  if (platform === "win32") {
    return "pnpm.cmd";
  }
  return "pnpm";
}

function runPnpm(spawnSync, args, env, cwd, platform) {
  try {
    const result = spawnSync(pnpmCommand(platform), args, {
      cwd,
      env,
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    });
    if (!result) {
      return { status: 1, stdout: "", stderr: "" };
    }
    const status = typeof result.status === "number" ? result.status : 1;
    let stderrText = asText(result.stderr);
    if (stderrText === "" && result.error && result.error.message) {
      stderrText = result.error.message;
    } else if (stderrText === "" && result.signal) {
      stderrText = String(result.signal);
    }
    return {
      status,
      stdout: asText(result.stdout),
      stderr: stderrText,
    };
  } catch (err) {
    return {
      status: 1,
      stdout: "",
      stderr: err && err.message ? err.message : String(err),
    };
  }
}

function forward(stream, text) {
  if (text !== "") {
    stream.write(text);
  }
}

function bootstrapOptions(opts, env, stdout, logPath, now) {
  const built = {
    env,
    stdout,
    logPath,
    now,
    platform: pick(opts.platform, process.platform),
    arch: pick(opts.arch, process.arch),
  };
  if (opts.release !== undefined) {
    built.release = opts.release;
  }
  if (opts.home !== undefined) {
    built.home = opts.home;
  }
  if (opts.tmpDir !== undefined) {
    built.tmpDir = opts.tmpDir;
  }
  if (opts.versionsPath !== undefined) {
    built.versionsPath = opts.versionsPath;
  }
  if (opts.bootstrapSpawn !== undefined) {
    built.spawnSync = opts.bootstrapSpawn;
  }
  if (opts.httpsGet !== undefined) {
    built.httpsGet = opts.httpsGet;
  }
  if (opts.versions !== undefined) {
    built.versions = opts.versions;
  }
  return built;
}

function finishStep(state, opts, env, platform, step, ok, message) {
  const versions = lastRecord.resolveVersions(
    opts.versions,
    childProcess.spawnSync,
    env,
    platform
  );
  lastRecord.writeRecord(
    state.logPath,
    lastRecord.buildRecord(step, ok, message, state.now(), versions)
  );
}

async function run(options) {
  const opts = options || {};
  const stdout = pick(opts.stdout, process.stdout);
  const stderr = pick(opts.stderr, process.stderr);
  const env = pick(opts.env, process.env);
  const platform = pick(opts.platform, process.platform);
  const cwd = pick(opts.cwd, process.cwd());
  const logPath = pick(
    opts.logPath,
    path.resolve(__dirname, "../../logs/startup.log")
  );
  const now = pick(opts.now, () => new Date());
  const bootstrapRun = pick(opts.bootstrapRun, bootstrap.run);
  const spawnSync = pick(opts.spawnSync, childProcess.spawnSync);
  const state = { stdout, logPath, now };

  writeLine(state, "INFO", "Krok BOOTSTRAP_BUN začíná.");
  const captured = captureStdout(stdout);
  let code;
  try {
    code = await bootstrapRun(
      bootstrapOptions(opts, env, captured.stream, logPath, now)
    );
  } catch (err) {
    const detail = err && err.message ? err.message : String(err);
    writeLine(state, "ERROR", "Krok BOOTSTRAP_BUN se nezdařil.");
    finishStep(state, opts, env, platform, "BOOTSTRAP_BUN", false, detail);
    return 1;
  }

  if (code !== 0) {
    if (!isHoldText(captured.text())) {
      writeLine(state, "ERROR", "Krok BOOTSTRAP_BUN se nezdařil.");
      finishStep(
        state,
        opts,
        env,
        platform,
        "BOOTSTRAP_BUN",
        false,
        captured.text()
      );
    }
    if (typeof code === "number") {
      return code;
    }
    return 1;
  }

  writeLine(state, "INFO", "Krok BOOTSTRAP_BUN skončil.");
  finishStep(
    state,
    opts,
    env,
    platform,
    "BOOTSTRAP_BUN",
    true,
    captured.text()
  );

  for (let i = 0; i < STEPS.length; i += 1) {
    const spec = STEPS[i];
    writeLine(state, "INFO", `Krok ${spec.step} začíná.`);
    const result = runPnpm(spawnSync, spec.args, env, cwd, platform);
    forward(stdout, result.stdout);
    // The old startup fails the update on any build stderr.
    const failed = result.status !== 0 || result.stderr !== "";
    const message = lastRecord.commandMessage(result.stderr, result.stdout);
    if (failed) {
      forward(stderr, result.stderr);
      writeLine(state, "ERROR", `Krok ${spec.step} se nezdařil.`);
      finishStep(state, opts, env, platform, spec.step, false, message);
      if (result.status !== 0) {
        return result.status;
      }
      return 1;
    }
    writeLine(state, "INFO", `Krok ${spec.step} skončil.`);
    finishStep(state, opts, env, platform, spec.step, true, message);
  }

  return 0;
}

if (require.main === module) {
  run()
    .then((code) => {
      process.exit(code);
    })
    .catch((err) => {
      const message = err && err.message ? err.message : String(err);
      process.stdout.write(`${message}\n`);
      process.exit(1);
    });
}

module.exports = {
  run,
};
