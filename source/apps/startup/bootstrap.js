// Installs the pinned Bun zip on a legacy box.
// Node 12 syntax. No packages. Stdout and one log file only.

const childProcess = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const https = require("https");
const os = require("os");
const path = require("path");

const LINUX_ZIP = "bun-linux-x64";
const WINDOWS_ZIP = "bun-windows-x64";
const MAX_MESSAGE = 2000;
const MAX_REDIRECTS = 5;
const DOWNLOAD_TIMEOUT_MS = 120000;

// 6.1, 6.2, and 6.3 cannot run Bun. A 10.0 build below 17763 cannot either.
const WIN10_MIN_BUILD = 17763;

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
  return `${stamp} ${level} [bootstrap] ${message}\n`;
}

function cap(text) {
  const value = String(text);
  if (value.length <= MAX_MESSAGE) {
    return value;
  }
  return value.slice(-MAX_MESSAGE);
}

function collapse(value) {
  if (value === undefined || value === null) {
    return "";
  }
  const collapsed = String(value)
    .replace(/[\n\r\t]+/g, " ")
    .replace(/ +/g, " ")
    .trim();
  return cap(collapsed);
}

function withDetail(message, detail) {
  const extra = collapse(detail);
  if (extra === "" || message.indexOf(extra) !== -1) {
    return cap(message);
  }
  return cap(`${message} ${extra}`);
}

function pick(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }
  return value;
}

function readVersions(text) {
  const out = {};
  const lines = String(text).split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (trimmed === "" || trimmed.charAt(0) === "#") {
      continue;
    }
    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key === "") {
      continue;
    }
    out[key] = value;
  }
  return out;
}

function isExactVersion(value) {
  return /^\d+\.\d+\.\d+$/.test(value);
}

function isSha256(value) {
  return /^[0-9a-f]{64}$/i.test(value);
}

function versionsMatch(actual, wanted) {
  if (actual === wanted) {
    return true;
  }
  if (actual === `v${wanted}`) {
    return true;
  }
  return false;
}

function firstLine(value) {
  const text = value === undefined || value === null ? "" : String(value);
  const line = text.split(/\r?\n/)[0];
  return line.trim();
}

/**
 * The check uses os.release() numbers. It does not look for a product name.
 */
function isOsHold(platform, release) {
  if (platform !== "win32") {
    return false;
  }
  const parts = String(release).split(".");
  const major = Number(parts[0]);
  const minor = Number(parts[1]);
  const build = Number(parts[2]);
  if (major === 6 && (minor === 1 || minor === 2 || minor === 3)) {
    return true;
  }
  if (major === 10 && minor === 0 && build < WIN10_MIN_BUILD) {
    return true;
  }
  return false;
}

function isIllegalInstruction(result) {
  if (!result) {
    return false;
  }
  if (result.signal === "SIGILL") {
    return true;
  }
  // Windows STATUS_ILLEGAL_INSTRUCTION is 0xC000001D.
  if (result.status === 3221225501 || result.status === -1073741795) {
    return true;
  }
  return false;
}

/**
 * The pinned asset only. The alias zip is the same x64 binary.
 */
function buildDownloadUrl(version, zipBase) {
  return (
    "https://github.com/oven-sh/bun/releases/download/bun-v" +
    `${version}/${zipBase}.zip`
  );
}

function prependPath(env, binDir) {
  const current = env.PATH || env.Path || "";
  const parts = String(current)
    .split(path.delimiter)
    .filter((part) => part !== "" && part !== binDir);
  parts.unshift(binDir);
  const next = parts.join(path.delimiter);
  env.PATH = next;
  if (Object.prototype.hasOwnProperty.call(env, "Path")) {
    env.Path = next;
  }
}

function writeLine(state, level, message) {
  const line = formatLine(state.now(), level, cap(message));
  state.stdout.write(line);
  try {
    fs.mkdirSync(path.dirname(state.logPath), { recursive: true });
    fs.appendFileSync(state.logPath, line);
  } catch (err) {
    // The console line is enough when the log directory is not writable.
  }
}

function isFile(filePath) {
  try {
    return fs.statSync(filePath).isFile();
  } catch (err) {
    return false;
  }
}

function rmRecursive(target) {
  let stat;
  try {
    stat = fs.lstatSync(target);
  } catch (err) {
    return;
  }
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    fs.unlinkSync(target);
    return;
  }
  const names = fs.readdirSync(target);
  for (let i = 0; i < names.length; i += 1) {
    rmRecursive(path.join(target, names[i]));
  }
  fs.rmdirSync(target);
}

function readHoldVersion(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return "";
    }
    return fs.readFileSync(filePath, "utf8").trim();
  } catch (err) {
    return "";
  }
}

function writeHold(filePath, version) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${version}\n`);
}

function writeLast(state, record) {
  const filePath = path.join(path.dirname(state.logPath), "startup.last.json");
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(record)}\n`);
  } catch (err) {
    // The console line is enough when the log directory is not writable.
  }
}

function holdOs(state, release) {
  const message = `Tento systém nespustí Bun. Krok OS_HOLD. Vydání ${release}.`;
  writeLine(state, "INFO", message);
  writeLast(state, {
    step: "OS_HOLD",
    ok: true,
    message,
  });
  return 1;
}

function clearHold(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    // A later boot records the hold again if the binary still cannot run.
  }
}

function spawnDetail(result) {
  const parts = [];
  if (result.error && result.error.message) {
    parts.push(result.error.message);
  }
  const stderr = collapse(result.stderr);
  const stdout = collapse(result.stdout);
  if (stderr !== "") {
    parts.push(stderr);
  }
  if (stdout !== "" && stdout !== stderr) {
    parts.push(stdout);
  }
  return collapse(parts.join(" "));
}

function spawnCaptured(spawnSync, command, args, env, shell) {
  try {
    const result = spawnSync(command, args, {
      env,
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      shell: shell === true,
    });
    if (!result) {
      return {
        status: 1,
        signal: null,
        stdout: "",
        stderr: "",
        error: new Error("spawn failed"),
      };
    }
    return result;
  } catch (err) {
    return {
      status: 1,
      signal: null,
      stdout: "",
      stderr: "",
      error: err,
    };
  }
}

function probeBun(spawnSync, exePath, env) {
  if (!fs.existsSync(exePath)) {
    return { state: "missing" };
  }
  const result = spawnCaptured(spawnSync, exePath, ["-v"], env, false);
  if (isIllegalInstruction(result)) {
    return { state: "illegal" };
  }
  if (result.error || result.status !== 0) {
    return { state: "error", detail: spawnDetail(result) };
  }
  return { state: "version", version: firstLine(result.stdout) };
}

function comparePm2(state, spawnSync, env, platform, wanted) {
  const result = spawnCaptured(
    spawnSync,
    "pm2",
    ["-v"],
    env,
    platform === "win32"
  );
  if (result.error && result.error.code === "ENOENT") {
    writeLine(state, "WARN", `pm2 chybí, chceme ${wanted}.`);
    return;
  }
  const have = firstLine(result.stdout);
  if (have === "") {
    writeLine(
      state,
      "WARN",
      withDetail(`pm2 nevrátil verzi, chceme ${wanted}.`, spawnDetail(result))
    );
    return;
  }
  if (versionsMatch(have, wanted)) {
    writeLine(state, "INFO", `pm2 ${wanted} se shoduje.`);
    return;
  }
  writeLine(state, "WARN", `pm2 je ${have}, chceme ${wanted}.`);
}

function nodeHttpsGet(urlString, callback) {
  let settled = false;
  function finish(err, res) {
    if (settled) {
      return;
    }
    settled = true;
    callback(err, res);
  }

  let req;
  try {
    req = https.get(
      urlString,
      { headers: { "User-Agent": "babybox-bootstrap" } },
      (res) => {
        req.setTimeout(0);
        finish(null, res);
      }
    );
  } catch (err) {
    finish(err);
    return;
  }

  req.on("error", (err) => {
    finish(err);
  });
  req.setTimeout(DOWNLOAD_TIMEOUT_MS, () => {
    req.abort();
    finish(new Error("Stažení Bun vypršelo."));
  });
}

function downloadToFile(urlString, dest, httpsGet) {
  return new Promise((resolve, reject) => {
    let redirects = 0;

    function once(current) {
      try {
        httpsGet(current, (err, res) => {
          if (err) {
            reject(err);
            return;
          }
          const code = res.statusCode;
          if (code >= 300 && code < 400) {
            let location = res.headers.location;
            if (Array.isArray(location)) {
              location = location[0];
            }
            res.resume();
            if (!location) {
              reject(new Error("Přesměrování nemá adresu."));
              return;
            }
            redirects += 1;
            if (redirects > MAX_REDIRECTS) {
              reject(new Error("Příliš mnoho přesměrování."));
              return;
            }
            let next;
            try {
              next = new URL(String(location).trim(), current).href;
            } catch (urlErr) {
              reject(urlErr);
              return;
            }
            if (next.indexOf("https://") !== 0) {
              reject(new Error("Přesměrování není https."));
              return;
            }
            once(next);
            return;
          }
          if (code !== 200) {
            res.resume();
            reject(new Error(`Stažení vrátilo stav ${code}.`));
            return;
          }
          const file = fs.createWriteStream(dest);
          let failed = false;
          function fail(error) {
            if (failed) {
              return;
            }
            failed = true;
            file.destroy();
            if (typeof res.destroy === "function") {
              res.destroy();
            }
            reject(error);
          }
          if (typeof res.setTimeout === "function") {
            res.setTimeout(DOWNLOAD_TIMEOUT_MS, () => {
              fail(new Error("Stažení Bun vypršelo."));
            });
          }
          res.on("error", fail);
          file.on("error", fail);
          file.on("finish", () => {
            if (failed) {
              return;
            }
            resolve();
          });
          res.pipe(file);
        });
      } catch (err) {
        reject(err);
      }
    }

    once(urlString);
  });
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => {
      hash.update(chunk);
    });
    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });
  });
}

function extractZip(spawnSync, platform, zipPath, destDir, env) {
  fs.mkdirSync(destDir, { recursive: true });
  const command = platform === "win32" ? "tar" : "unzip";
  // GNU tar treats C: as a remote host. --force-local keeps the drive local.
  const args =
    platform === "win32"
      ? ["--force-local", "-xf", zipPath, "-C", destDir]
      : ["-o", "-q", "-d", destDir, zipPath];
  const result = spawnCaptured(spawnSync, command, args, env, false);
  if (result.error && result.error.code === "ENOENT") {
    return { ok: false, missingTool: true, detail: spawnDetail(result) };
  }
  if (result.error || result.status !== 0) {
    return { ok: false, detail: spawnDetail(result) };
  }
  return { ok: true };
}

function findExtractedBun(destDir, folderName, exeName) {
  const expected = path.join(destDir, folderName, exeName);
  if (isFile(expected)) {
    return expected;
  }
  const top = path.join(destDir, exeName);
  if (isFile(top)) {
    return top;
  }
  if (!fs.existsSync(destDir)) {
    return null;
  }
  const names = fs.readdirSync(destDir);
  for (let i = 0; i < names.length; i += 1) {
    const nested = path.join(destDir, names[i], exeName);
    if (isFile(nested)) {
      return nested;
    }
  }
  return null;
}

async function installPinnedBun(spec) {
  let stage = null;
  try {
    stage = fs.mkdtempSync(path.join(spec.tmp, "babybox-bun-"));
    const zipPath = path.join(stage, `${spec.zipBase}.zip`);
    const url = buildDownloadUrl(spec.version, spec.zipBase);
    if (url.indexOf("x64-baseline") !== -1) {
      return { ok: false, message: "Stažení Bun se nezdařilo." };
    }
    try {
      await downloadToFile(url, zipPath, spec.httpsGet);
    } catch (err) {
      const detail = err && err.message ? err.message : String(err);
      return {
        ok: false,
        message: withDetail("Stažení Bun se nezdařilo.", detail),
      };
    }
    const actual = await sha256File(zipPath);
    if (actual.toLowerCase() !== spec.sha.toLowerCase()) {
      return {
        ok: false,
        message: "Kontrolní součet archivu Bun se neshoduje.",
      };
    }
    const extractDir = path.join(stage, "extract");
    const extracted = extractZip(
      spec.spawnSync,
      spec.platform,
      zipPath,
      extractDir,
      spec.env
    );
    if (!extracted.ok) {
      if (extracted.missingTool) {
        return { ok: false, message: "Chybí program pro rozbalení archivu." };
      }
      return {
        ok: false,
        message: withDetail("Rozbalení Bun se nezdařilo.", extracted.detail),
      };
    }
    const found = findExtractedBun(extractDir, spec.zipBase, spec.exeName);
    if (!found) {
      return {
        ok: false,
        message: "Rozbalení Bun se nezdařilo. V archivu chybí bun.",
      };
    }
    fs.mkdirSync(spec.binDir, { recursive: true });
    fs.copyFileSync(found, spec.exePath);
    if (spec.platform !== "win32") {
      fs.chmodSync(spec.exePath, 0o755);
    }
    return { ok: true };
  } finally {
    if (stage) {
      rmRecursive(stage);
    }
  }
}

function createState(opts) {
  return {
    stdout: pick(opts.stdout, process.stdout),
    logPath: pick(
      opts.logPath,
      path.resolve(__dirname, "../../logs/startup.log")
    ),
    now: pick(opts.now, () => new Date()),
  };
}

function holdCpu(
  state,
  spawnSync,
  env,
  platform,
  pm2Version,
  holdPath,
  version
) {
  writeHold(holdPath, version);
  writeLine(state, "INFO", "Procesor nespustí Bun. Krok CPU_HOLD.");
  comparePm2(state, spawnSync, env, platform, pm2Version);
  return 1;
}

async function runInner(state, opts) {
  const platform = pick(opts.platform, process.platform);
  const arch = pick(opts.arch, process.arch);
  const release = pick(opts.release, os.release());
  const home = pick(opts.home, os.homedir());
  const tmp = pick(opts.tmpDir, os.tmpdir());
  const versionsPath = pick(
    opts.versionsPath,
    path.join(__dirname, "versions.env")
  );
  const spawnSync = pick(opts.spawnSync, childProcess.spawnSync);
  const httpsGet = pick(opts.httpsGet, nodeHttpsGet);
  // Child processes see this PATH. The parent shell does not.
  const env = pick(opts.env, process.env);

  if (isOsHold(platform, release)) {
    return holdOs(state, release);
  }

  if (arch !== "x64") {
    writeLine(
      state,
      "ERROR",
      `Archiv Bun je jen pro x64. Architektura ${arch}.`
    );
    return 1;
  }

  if (platform !== "linux" && platform !== "win32") {
    writeLine(
      state,
      "ERROR",
      `Pro tento systém není archiv Bun. Systém ${platform}.`
    );
    return 1;
  }

  let versions;
  try {
    versions = readVersions(fs.readFileSync(versionsPath, "utf8"));
  } catch (err) {
    writeLine(state, "ERROR", "Soubor versions.env se nepodařilo přečíst.");
    return 1;
  }

  const zipBase = platform === "win32" ? WINDOWS_ZIP : LINUX_ZIP;
  const shaKey =
    platform === "win32" ? "BUN_WINDOWS_X64_SHA256" : "BUN_LINUX_X64_SHA256";
  const exeName = platform === "win32" ? "bun.exe" : "bun";
  const version = versions.BUN_VERSION;
  const sha = versions[shaKey];
  const pm2Version = versions.PM2_VERSION;
  if (!isExactVersion(version)) {
    writeLine(
      state,
      "ERROR",
      "Ve versions.env chybí platná hodnota BUN_VERSION."
    );
    return 1;
  }
  if (!isSha256(sha)) {
    writeLine(
      state,
      "ERROR",
      `Ve versions.env chybí platná hodnota ${shaKey}.`
    );
    return 1;
  }
  if (!isExactVersion(pm2Version)) {
    writeLine(
      state,
      "ERROR",
      "Ve versions.env chybí platná hodnota PM2_VERSION."
    );
    return 1;
  }

  const binDir = path.join(home, ".bun", "bin");
  const exePath = path.join(binDir, exeName);
  const holdPath = path.join(home, ".bun", "cpu-hold");
  prependPath(env, binDir);

  const probed = probeBun(spawnSync, exePath, env);
  if (probed.state === "version" && versionsMatch(probed.version, version)) {
    clearHold(holdPath);
    writeLine(state, "INFO", `Bun ${version} už je nainstalovaný.`);
    comparePm2(state, spawnSync, env, platform, pm2Version);
    return 0;
  }

  if (probed.state === "illegal") {
    const recorded = readHoldVersion(holdPath);
    if (recorded === "" || recorded === version) {
      return holdCpu(
        state,
        spawnSync,
        env,
        platform,
        pm2Version,
        holdPath,
        version
      );
    }
  }

  if (probed.state === "error") {
    writeLine(
      state,
      "WARN",
      withDetail(
        "Bun se nepodařilo spustit. Zkouším instalaci znovu.",
        probed.detail
      )
    );
  }

  writeLine(state, "INFO", `Stahuji Bun ${version}.`);
  const installed = await installPinnedBun({
    tmp,
    version,
    sha,
    zipBase,
    exeName,
    exePath,
    binDir,
    platform,
    env,
    spawnSync,
    httpsGet,
  });
  if (!installed.ok) {
    writeLine(state, "ERROR", installed.message);
    comparePm2(state, spawnSync, env, platform, pm2Version);
    return 1;
  }

  const after = probeBun(spawnSync, exePath, env);
  if (after.state === "illegal") {
    return holdCpu(
      state,
      spawnSync,
      env,
      platform,
      pm2Version,
      holdPath,
      version
    );
  }
  if (after.state === "version" && versionsMatch(after.version, version)) {
    clearHold(holdPath);
    writeLine(state, "INFO", `Bun ${version} je nainstalovaný.`);
    comparePm2(state, spawnSync, env, platform, pm2Version);
    return 0;
  }

  const have = after.state === "version" ? after.version : "";
  const mismatch =
    have === ""
      ? "Bun se nepodařilo spustit."
      : `Bun je ${have}, chceme ${version}.`;
  writeLine(state, "ERROR", withDetail(mismatch, after.detail));
  comparePm2(state, spawnSync, env, platform, pm2Version);
  return 1;
}

async function run(options) {
  const opts = options || {};
  const state = createState(opts);
  try {
    return await runInner(state, opts);
  } catch (err) {
    const detail = err && err.message ? err.message : String(err);
    try {
      writeLine(
        state,
        "ERROR",
        withDetail("Příprava Bun se nezdařila.", detail)
      );
    } catch (logErr) {
      state.stdout.write("Příprava Bun se nezdařila.\n");
    }
    return 1;
  }
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
  buildDownloadUrl,
  isIllegalInstruction,
  isOsHold,
  prependPath,
  readVersions,
  run,
};
