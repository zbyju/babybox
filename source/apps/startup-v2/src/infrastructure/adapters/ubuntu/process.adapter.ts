/**
 * Process adapter for Ubuntu (PM2).
 */

import { ok, err } from "neverthrow";
import type { ProcessPort } from "../../../application/ports/process.port.js";
import * as pm2 from "../../wrappers/pm2.js";

export function createUbuntuProcessAdapter(): ProcessPort {
  return {
    start: async (name, script, cwd) => {
      const result = await pm2.pm2Start(name, script, cwd);
      if (result.isErr()) {
        return err({
          operation: "start",
          processName: name as string,
          message: result.error.message,
        });
      }
      return ok(result.value);
    },

    startBun: async (name, scriptPath, cwd) => {
      const result = await pm2.pm2StartBun(name, scriptPath, cwd);
      if (result.isErr()) {
        return err({
          operation: "startBun",
          processName: name as string,
          message: result.error.message,
        });
      }
      return ok(result.value);
    },

    stop: async (name) => {
      const result = await pm2.pm2Stop(name);
      if (result.isErr()) {
        return err({
          operation: "stop",
          processName: name as string,
          message: result.error.message,
        });
      }
      return ok(result.value);
    },

    delete: async (name) => {
      const result = await pm2.pm2Delete(name);
      if (result.isErr()) {
        return err({
          operation: "delete",
          processName: name as string,
          message: result.error.message,
        });
      }
      return ok(result.value);
    },

    restart: async (name) => {
      const result = await pm2.pm2Restart(name);
      if (result.isErr()) {
        return err({
          operation: "restart",
          processName: name as string,
          message: result.error.message,
        });
      }
      return ok(result.value);
    },

    isManagerInstalled: () => pm2.pm2IsInstalled(),
  };
}
