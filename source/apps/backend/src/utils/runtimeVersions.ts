import { spawnSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const VERSION_TIMEOUT_MS = 5000;

export type RuntimeVersions = {
  node: string;
  pnpm: string;
  bun: string;
};

export type StartupLast = {
  step: string;
  ok: boolean;
  message: string;
  at: string;
  node: string;
  pnpm: string;
  bun: string;
};

export type StatusBody = {
  msg: "Alive.";
  node: string;
  pnpm: string;
  bun: string;
  startup: StartupLast | null;
};

const MAX_RECORD_BYTES = 16 * 1024;

/*
 * A caller supplies the command runner so a test does not spawn a process.
 * `node` is process.version. That string matches `node -v`.
 */
export type VersionCommand = (
  command: string,
  args: readonly string[]
) => string;

export function runtimeVersions(run: VersionCommand): RuntimeVersions {
  return {
    node: process.version,
    pnpm: ask(run, "pnpm"),
    bun: ask(run, "bun"),
  };
}

export function statusBody(
  versions: RuntimeVersions,
  startup: StartupLast | null
): StatusBody {
  return {
    msg: "Alive.",
    node: versions.node,
    pnpm: versions.pnpm,
    bun: versions.bun,
    startup,
  };
}

/*
 * `startup` is startup.last.json, next to startup.log.
 * A missing file, a huge file, or a record without the step fields is null.
 */
export function startupLastFor(startDir: string): StartupLast | null {
  const filePath = findStartupLast(startDir);
  if (filePath === null) {
    return null;
  }
  return readStartupLast(filePath);
}

export function parseStartupLast(text: string): StartupLast | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value)) {
    return null;
  }
  const step = value.step;
  const ok = value.ok;
  const message = value.message;
  const at = value.at;
  const node = value.node;
  const pnpm = value.pnpm;
  const bun = value.bun;
  if (
    typeof step !== "string" ||
    typeof ok !== "boolean" ||
    typeof message !== "string" ||
    typeof at !== "string" ||
    typeof node !== "string" ||
    typeof pnpm !== "string" ||
    typeof bun !== "string"
  ) {
    return null;
  }
  return { step, ok, message, at, node, pnpm, bun };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && Array.isArray(value) === false;
}

function hasStartupApp(dir: string): boolean {
  return fs.existsSync(path.join(dir, "apps", "startup", "versions.env"));
}

function findStartupLast(startDir: string): string | null {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 8; i += 1) {
    if (hasStartupApp(dir)) {
      const inLogs = path.join(dir, "logs", "startup.last.json");
      if (fs.existsSync(inLogs)) {
        return inLogs;
      }
    }
    if (hasStartupApp(path.join(dir, "source"))) {
      const inSourceLogs = path.join(dir, "source", "logs", "startup.last.json");
      if (fs.existsSync(inSourceLogs)) {
        return inSourceLogs;
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
  return null;
}

function readStartupLast(filePath: string): StartupLast | null {
  try {
    const stat = fs.statSync(filePath);
    if (stat.isFile() === false || stat.size > MAX_RECORD_BYTES) {
      return null;
    }
    return parseStartupLast(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

let cached: RuntimeVersions | undefined;

/*
 * Read pnpm and bun once per process. The panel polls the backend status route.
 * A missing binary, a non-zero exit, or a timeout is an empty string.
 * bun stays empty until P1 installs that binary.
 * Configer keeps a copy of this file. The backend dist cannot import it.
 */
export function cachedRuntimeVersions(): RuntimeVersions {
  if (cached === undefined) {
    cached = runtimeVersions(readCommandVersion);
  }
  return cached;
}

function ask(run: VersionCommand, command: string): string {
  try {
    return firstLine(run(command, ["-v"]));
  } catch {
    return "";
  }
}

export function readCommandVersion(
  command: string,
  args: readonly string[]
): string {
  try {
    const result = spawnSync(command, args, {
      encoding: "utf8",
      timeout: VERSION_TIMEOUT_MS,
      windowsHide: true,
      shell: useShell(command),
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.error !== undefined || result.status !== 0) {
      return "";
    }
    return firstLine(result.stdout);
  } catch {
    return "";
  }
}

function firstLine(stdout: string): string {
  const line = stdout.split(/\r?\n/, 1)[0];
  if (line === undefined) {
    return "";
  }
  return line.trim();
}

/*
 * Windows runs pnpm and bun through cmd. Those names are .cmd shims.
 * A path is an executable. Spawn runs a path with no shell.
 */
function useShell(command: string): boolean {
  if (process.platform !== "win32") {
    return false;
  }
  return command.indexOf("/") === -1 && command.indexOf("\\") === -1;
}
