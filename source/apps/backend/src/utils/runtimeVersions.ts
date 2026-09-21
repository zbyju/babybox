import { spawnSync } from "child_process";

const VERSION_TIMEOUT_MS = 5000;

export type RuntimeVersions = {
  node: string;
  pnpm: string;
  bun: string;
};

export type StatusBody = {
  msg: "Alive.";
  node: string;
  pnpm: string;
  bun: string;
};

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

export function statusBody(versions: RuntimeVersions): StatusBody {
  return {
    msg: "Alive.",
    node: versions.node,
    pnpm: versions.pnpm,
    bun: versions.bun,
  };
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
