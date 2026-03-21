/**
 * Package manager adapter for Ubuntu (Bun).
 */

import { ok } from "neverthrow";
import type { PackageManagerPort } from "../../../application/ports/package-manager.port.js";
import type { DirectoryPath } from "../../../domain/types/index.js";
import { BuildResult as BR, durationMs, shellCommand } from "../../../domain/types/index.js";
import { executeInDirectory } from "../../wrappers/shell.js";

export function createUbuntuPackageManagerAdapter(): PackageManagerPort {
  return {
    install: async (cwd) => {
      const result = await executeInDirectory(
        shellCommand("bun install"),
        cwd,
        durationMs(120000) // 2 minutes for install
      );

      const shellResult = result._unsafeUnwrap();

      switch (shellResult.kind) {
        case "success":
          return ok({ kind: "success" });

        case "non_zero_exit":
          return ok({
            kind: "install_failed",
            message: shellResult.stderr || `Exit code: ${shellResult.exitCode}`,
          });

        case "timeout":
          return ok({
            kind: "install_failed",
            message: "Instalace zavislosti vyprsela",
          });

        case "spawn_error":
          if (
            shellResult.message.includes("not found") ||
            shellResult.message.includes("command not found")
          ) {
            return ok({ kind: "bun_not_found" });
          }
          return ok({
            kind: "install_failed",
            message: shellResult.message,
          });
      }
    },

    build: async (cwd) => {
      const startTime = Date.now();

      const result = await executeInDirectory(
        shellCommand("bun run build"),
        cwd,
        durationMs(300000) // 5 minutes for build
      );

      const duration = durationMs(Date.now() - startTime);
      const shellResult = result._unsafeUnwrap();

      switch (shellResult.kind) {
        case "success":
          return ok(BR.success(duration));

        case "non_zero_exit": {
          // Parse errors from output
          const errors = shellResult.stderr
            .split("\n")
            .filter((line) => line.includes("error") || line.includes("Error"))
            .slice(0, 10); // Limit to 10 errors

          return ok(
            BR.compilationFailed(
              shellResult.stderr || `Build selhal s kodem ${shellResult.exitCode}`,
              errors
            )
          );
        }

        case "timeout":
          return ok(BR.unknownError("Build vyprsel casovy limit"));

        case "spawn_error":
          return ok(BR.unknownError(shellResult.message));
      }
    },

    isInstalled: async () => {
      const result = await executeInDirectory(
        shellCommand("bun --version"),
        "." as DirectoryPath
      );
      const shellResult = result._unsafeUnwrap();
      return shellResult.kind === "success";
    },
  };
}
