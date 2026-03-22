/**
 * Operating system detection.
 */

import type { OperatingSystem } from "../domain/types/index";
import { OS } from "../domain/types/index";

/**
 * Detect the current operating system.
 */
export function detectOS(): OperatingSystem {
  const platform = process.platform;

  switch (platform) {
    case "linux":
      return OS.ubuntu();
    case "win32":
      return OS.windows();
    case "darwin":
      return OS.mac();
    default:
      // Default to Ubuntu for unknown Linux-like systems
      return OS.ubuntu();
  }
}

/**
 * Parse OS from CLI argument.
 */
export function parseOSFromArg(arg: string | undefined): OperatingSystem | null {
  if (!arg) return null;

  const lower = arg.toLowerCase();
  if (lower === "ubuntu" || lower === "linux") {
    return OS.ubuntu();
  }
  if (lower === "windows" || lower === "win") {
    return OS.windows();
  }
  if (lower === "mac" || lower === "macos" || lower === "darwin") {
    return OS.mac();
  }

  return null;
}

/**
 * Get OS from CLI flags or detect automatically.
 */
export function resolveOS(flags: {
  ubuntu?: boolean | undefined;
  windows?: boolean | undefined;
  mac?: boolean | undefined;
}): OperatingSystem {
  if (flags.ubuntu) return OS.ubuntu();
  if (flags.windows) return OS.windows();
  if (flags.mac) return OS.mac();
  return detectOS();
}
