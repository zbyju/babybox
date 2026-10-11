/*
 * Checks that pm2 runs configer and babybox on the runtime we want.
 * Run: node apps/startup/tests/assert-runtime.js bun|node
 * Bun means the absolute ~/.bun/bin path, in pm2 and in the process itself.
 * Each app must be online with no restart.
 */

const childProcess = require("child_process");
const fs = require("fs");
const { createRequire } = require("module");
const os = require("os");
const path = require("path");

const APPS = ["configer", "babybox"];

function bunPath() {
  const name = process.platform === "win32" ? "bun.exe" : "bun";
  return path.join(os.homedir(), ".bun", "bin", name);
}

function samePath(a, b) {
  if (process.platform === "win32") {
    return (
      path.win32.normalize(a).toLowerCase() ===
      path.win32.normalize(b).toLowerCase()
    );
  }
  return a === b;
}

function run(command, args) {
  const opts = {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  };
  // pm2 is a .cmd shim on Windows.
  if (process.platform === "win32" && command === "pm2") {
    return childProcess.spawnSync(
      ["pm2"].concat(args).join(" "),
      [],
      Object.assign({ shell: true }, opts)
    );
  }
  return childProcess.spawnSync(command, args, opts);
}

// An old pm2 can print a banner, such as "[PM2] ...", around the JSON.
function readApps() {
  const result = run("pm2", ["jlist"]);
  const text = String(result.stdout || "");
  const first = text.search(/\[\s*[{\]]/);
  const last = text.lastIndexOf("]");
  if (result.status !== 0 || first === -1 || last < first) {
    const cause = result.error ? result.error.message : result.stderr;
    throw new Error(`pm2 jlist failed: ${text} ${cause || ""}`);
  }
  return JSON.parse(text.slice(first, last + 1));
}

function executable(pid) {
  if (process.platform === "win32") {
    const result = run("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `(Get-Process -Id ${pid}).Path`,
    ]);
    return String(result.stdout || "").trim();
  }
  try {
    return fs.readlinkSync(`/proc/${pid}/exe`);
  } catch (err) {
    return "";
  }
}

function isNode(exe) {
  const name = path.basename(exe).toLowerCase();
  return name === "node" || name === "node.exe";
}

function problemsOf(app, want, bun) {
  const env = app.pm2_env || {};
  const problems = [];
  if (env.status !== "online") {
    problems.push(`status is ${env.status}`);
  }
  if (env.restart_time !== 0) {
    problems.push(`restart_time is ${env.restart_time}`);
  }
  const interpreter = String(env.exec_interpreter);
  const exe = app.pid ? executable(app.pid) : "";
  if (want === "bun") {
    if (!samePath(interpreter, bun)) {
      problems.push(`exec_interpreter is ${interpreter}, want ${bun}`);
    }
    if (!samePath(exe, bun)) {
      problems.push(`pid ${app.pid} runs ${exe}, want ${bun}`);
    }
  } else {
    if (interpreter !== "node") {
      problems.push(`exec_interpreter is ${interpreter}, want node`);
    }
    if (!isNode(exe)) {
      problems.push(`pid ${app.pid} runs ${exe}, want node`);
    }
  }
  return problems;
}

function moduleSource() {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "apps", "configer", "package.json"))) {
    return cwd;
  }
  return path.resolve(__dirname, "../../..");
}

function isInside(parent, child) {
  let from = parent;
  let to = child;
  try {
    from = fs.realpathSync(parent);
    to = fs.realpathSync(child);
  } catch (err) {
    return false;
  }
  if (process.platform === "win32") {
    from = from.toLowerCase();
    to = to.toLowerCase();
  }
  const rel = path.relative(from, to);
  if (rel === "" || path.isAbsolute(rel)) {
    return false;
  }
  if (rel === ".." || rel.indexOf(`..${path.sep}`) === 0) {
    return false;
  }
  return true;
}

function checkResolved(req, name, isolated, problems) {
  let resolved;
  try {
    resolved = req.resolve(name);
  } catch (err) {
    problems.push(`${name}: ${err.message}`);
    return;
  }
  let real = resolved;
  try {
    real = fs.realpathSync(resolved);
  } catch (err) {
    real = resolved;
  }
  if (!isInside(isolated, resolved) || !isInside(isolated, real)) {
    problems.push(`${name} resolves to ${real}`);
  }
  if (fs.lstatSync(resolved).isSymbolicLink()) {
    problems.push(`${name} is a symlink`);
  }
}

function checkConfigs(source, problems) {
  const configs = path.join(source, "apps", "configer", "configs");
  const files = [
    ["version.js", "../../../configs/versions.json"],
    ["main.js", "../../../configs"],
  ];
  for (let i = 0; i < files.length; i += 1) {
    const fileName = files[i][0];
    const needle = files[i][1];
    const filePath = path.join(
      source,
      "apps",
      "configer",
      "dist",
      "services",
      "db",
      fileName
    );
    if (!fs.existsSync(filePath)) {
      problems.push(`${fileName} chybí`);
      continue;
    }
    const text = fs.readFileSync(filePath, "utf8");
    if (text.indexOf(needle) === -1) {
      problems.push(`${fileName} does not read ${needle}`);
    }
    const resolved = fs.realpathSync(
      path.resolve(path.dirname(filePath), "../../../configs")
    );
    if (resolved !== fs.realpathSync(configs)) {
      problems.push(`${fileName} configs path is ${resolved}`);
    }
  }
}

function checkModules() {
  const source = moduleSource();
  const isolated = path.join(source, "apps", "configer", "dist", "node_modules");
  const distIndex = path.join(source, "apps", "configer", "dist", "index.js");
  const problems = [];
  if (!fs.existsSync(distIndex)) {
    problems.push("configer dist/index.js chybí");
  } else if (!fs.existsSync(isolated)) {
    problems.push("configer dist/node_modules chybí");
  } else {
    const req = createRequire(distIndex);
    checkResolved(req, "lowdb", isolated, problems);
    checkResolved(req, "@babybox/config-schema", isolated, problems);
    if (fs.existsSync(path.join(isolated, "configs", "main.json"))) {
      problems.push("isolated tree contains configs/main.json");
    }
    if (fs.existsSync(path.join(isolated, "configs", "versions.json"))) {
      problems.push("isolated tree contains configs/versions.json");
    }
  }
  checkConfigs(source, problems);
  if (problems.length > 0) {
    process.stderr.write(`${problems.join("\n")}\n`);
    return 1;
  }
  process.stdout.write("configer loads packages from dist/node_modules\n");
  return 0;
}

function main(want) {
  if (want === "modules") {
    return checkModules();
  }
  if (want !== "bun" && want !== "node") {
    process.stderr.write("usage: assert-runtime.js bun|node|modules\n");
    return 2;
  }
  const bun = bunPath();
  let lines = [];
  try {
    const apps = readApps();
    APPS.forEach((name) => {
      const app = apps.find((entry) => entry.name === name);
      if (!app) {
        lines.push(`${name}: not in pm2 jlist`);
        return;
      }
      problemsOf(app, want, bun).forEach((problem) => {
        lines.push(`${name}: ${problem}`);
      });
    });
  } catch (err) {
    lines = [err.message];
  }
  if (lines.length > 0) {
    process.stderr.write(`${lines.join("\n")}\n`);
    return 1;
  }
  process.stdout.write(`configer and babybox run on ${want}\n`);
  return 0;
}

process.exitCode = main(process.argv[2]);
