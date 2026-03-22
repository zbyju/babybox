/**
 * Build orchestrator - handles dependency installation and compilation.
 */

import { type Result, ok, err } from "neverthrow";
import type { AppContext } from "../context";
import type { DirectoryPath } from "../../domain/types/index";
import { suggestionsForBuild } from "../../domain/functions/index";
import { Messages } from "../../presentation/messages";

export type BuildPhaseResult =
  | { readonly kind: "success"; readonly durationMs: number }
  | { readonly kind: "skipped"; readonly reason: string }
  | { readonly kind: "failed"; readonly message: string };

/**
 * Execute the build phase.
 * Installs dependencies and compiles the application.
 */
export async function executeBuild(
  ctx: AppContext,
  shouldBuild: boolean,
  skipReason?: string
): Promise<Result<BuildPhaseResult, string>> {
  const { logger, packageManager, config } = ctx;
  const repoPath = config.repositoryPath as DirectoryPath;

  if (!shouldBuild) {
    logger.info("build", skipReason ?? "Build preskocen");
    return ok({ kind: "skipped", reason: skipReason ?? "Build preskocen" });
  }

  logger.info("build", Messages.build.starting);
  const startTime = Date.now();

  // Install dependencies
  logger.info("build", Messages.build.installingDeps);
  const installResult = await packageManager.install(repoPath);

  if (installResult.isErr()) {
    logger.error("build", Messages.build.depsFailed, [], {
      error: { name: "InstallError", message: installResult.error },
    });
    return err(installResult.error);
  }

  const installValue = installResult.value;
  if (installValue.kind !== "success") {
    const message =
      installValue.kind === "bun_not_found"
        ? "Bun neni nainstalovan"
        : installValue.message;

    logger.error(
      "build",
      message,
      suggestionsForBuild(
        { kind: "dependency_install_failed", message },
        repoPath
      )
    );
    return ok({ kind: "failed", message });
  }

  // Run build
  logger.info("build", Messages.build.compiling);
  const buildResult = await packageManager.build(repoPath);

  if (buildResult.isErr()) {
    logger.error("build", Messages.build.failed, [], {
      error: { name: "BuildError", message: buildResult.error },
    });
    return err(buildResult.error);
  }

  const buildValue = buildResult.value;
  if (buildValue.kind !== "success") {
    logger.error(
      "build",
      Messages.build.failed,
      suggestionsForBuild(buildValue, repoPath)
    );
    return ok({
      kind: "failed",
      message:
        buildValue.kind === "compilation_failed"
          ? buildValue.errors.join("; ")
          : buildValue.message,
    });
  }

  const duration = Date.now() - startTime;
  logger.info("build", Messages.build.success(duration));

  return ok({ kind: "success", durationMs: duration });
}
