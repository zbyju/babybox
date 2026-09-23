// One startup.last.json record per step end. Node 12 syntax. No packages.
// message is the step output, collapsed, without a node_modules stack.

const childProcess = require("child_process");
const fs = require("fs");
const path = require("path");

const MAX_MESSAGE = 2000;

function asText(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value);
}

function cap(text) {
  if (text.length <= MAX_MESSAGE) {
    return text;
  }
  return text.slice(-MAX_MESSAGE);
}

function stripNodeModulesStacks(value) {
  const lines = asText(value).split(/\r?\n/);
  const kept = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*at\s/.test(line) && line.indexOf("node_modules") !== -1) {
      continue;
    }
    kept.push(line);
  }
  return kept.join("\n");
}

function collapseMessage(value) {
  const collapsed = stripNodeModulesStacks(value)
    .replace(/[\n\r\t]+/g, " ")
    .replace(/ +/g, " ")
    .trim();
  return cap(collapsed);
}

function commandMessage(stderr, stdout) {
  return collapseMessage(
    `${stripNodeModulesStacks(stderr)}\n${stripNodeModulesStacks(stdout)}`
  );
}

function firstLine(value) {
  const line = asText(value).split(/\r?\n/)[0];
  return line.trim();
}

function useShell(platform, command) {
  if (platform !== "win32") {
    return false;
  }
  return command.indexOf("/") === -1 && command.indexOf("\\") === -1;
}

function readToolVersion(spawnSync, command, env, platform) {
  try {
    const result = spawnSync(command, ["-v"], {
      env,
      encoding: "utf8",
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      shell: useShell(platform, command),
    });
    if (!result || result.error || result.status !== 0) {
      return "";
    }
    return firstLine(result.stdout);
  } catch (err) {
    return "";
  }
}

function resolveVersions(explicit, spawnSync, env, platform) {
  if (explicit !== undefined && explicit !== null) {
    return {
      node: asText(explicit.node),
      pnpm: asText(explicit.pnpm),
      bun: asText(explicit.bun),
    };
  }
  const spawn = spawnSync || childProcess.spawnSync;
  const childEnv = env || process.env;
  return {
    node: process.version,
    pnpm: readToolVersion(spawn, "pnpm", childEnv, platform),
    bun: readToolVersion(spawn, "bun", childEnv, platform),
  };
}

function buildRecord(step, ok, message, date, versions) {
  const tools = versions || { node: "", pnpm: "", bun: "" };
  return {
    step,
    ok: ok === true,
    message: collapseMessage(message),
    at: date.toISOString(),
    node: asText(tools.node),
    pnpm: asText(tools.pnpm),
    bun: asText(tools.bun),
  };
}

function writeRecord(logPath, record) {
  const filePath = path.join(path.dirname(logPath), "startup.last.json");
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(record)}\n`);
  } catch (err) {
    // The console line is enough when the log directory is not writable.
  }
}

module.exports = {
  buildRecord,
  collapseMessage,
  commandMessage,
  resolveVersions,
  writeRecord,
};
