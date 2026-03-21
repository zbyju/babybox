/**
 * Process adapter for Windows.
 * TODO: Implement Windows service management (possibly using NSSM or similar).
 */

import { err } from "neverthrow";
import type { ProcessPort } from "../../../application/ports/process.port.js";

export function createWindowsProcessAdapter(): ProcessPort {
  const notImplemented = async () =>
    err({
      operation: "notImplemented",
      processName: "",
      message: "Windows process adapter neni implementovan",
    });

  return {
    start: () => notImplemented(),
    startBun: () => notImplemented(),
    stop: () => notImplemented(),
    delete: () => notImplemented(),
    restart: () => notImplemented(),
    isManagerInstalled: async () => false,
  };
}
