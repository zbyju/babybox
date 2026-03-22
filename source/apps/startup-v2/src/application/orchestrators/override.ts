/**
 * Override orchestrator - handles deployment of new build to dist.
 */

import { type Result, ok } from "neverthrow";
import type { AppContext } from "../context";
import { suggestionsForOverride } from "../../domain/functions/index";
import { Messages } from "../../presentation/messages";

export type OverridePhaseResult =
  | { readonly kind: "success" }
  | { readonly kind: "skipped"; readonly reason: string }
  | { readonly kind: "failed"; readonly message: string }
  | { readonly kind: "rollback_success" }
  | { readonly kind: "rollback_failed"; readonly message: string };

/**
 * Execute the override phase.
 * Backs up current dist, copies new build, handles rollback on failure.
 */
export async function executeOverride(
  ctx: AppContext,
  shouldOverride: boolean,
  skipReason?: string
): Promise<Result<OverridePhaseResult, string>> {
  const { logger, fs, config } = ctx;
  const { distPath, distBackupPath } = config;

  if (!shouldOverride) {
    logger.info("override", skipReason ?? "Override preskocen");
    return ok({ kind: "skipped", reason: skipReason ?? "Override preskocen" });
  }

  logger.info("override", Messages.override.starting);

  // Check if dist exists
  const distExists = fs.exists(distPath);

  // Backup current dist if it exists
  if (distExists) {
    logger.info("override", Messages.override.backingUp);

    // Remove old backup if exists
    const removeResult = await fs.remove(distBackupPath, true);
    if (removeResult.isErr()) {
      logger.warn("override", `Nelze smazat starou zalohu: ${removeResult.error.message}`, []);
      // Continue anyway
    }

    // Rename current dist to backup
    const renameResult = await fs.rename(distPath, distBackupPath);
    if (renameResult.isErr()) {
      logger.error(
        "override",
        Messages.override.failed,
        suggestionsForOverride(
          { kind: "backup_failed", message: renameResult.error.message },
          distPath,
          distBackupPath
        )
      );
      return ok({
        kind: "failed",
        message: `Zaloha selhala: ${renameResult.error.message}`,
      });
    }
  }

  // Copy new build to dist
  logger.info("override", Messages.override.copying);
  const sourceBuildPath = `${config.repositoryPath}/source/build`;

  // Check if source build exists
  if (!fs.exists(sourceBuildPath)) {
    // Try alternative path
    const altBuildPath = `${config.repositoryPath}/dist`;
    if (!fs.exists(altBuildPath)) {
      const rollbackResult = await attemptRollback(ctx);
      if (rollbackResult.kind === "rollback_success") {
        return ok(rollbackResult);
      }
      return ok({
        kind: "failed",
        message: "Zdrojovy build neexistuje",
      });
    }
  }

  const copyResult = await fs.copyDirectory(sourceBuildPath, distPath);
  if (copyResult.isErr()) {
    logger.error(
      "override",
      Messages.override.failed,
      suggestionsForOverride(
        { kind: "copy_failed", message: copyResult.error.message },
        distPath,
        distBackupPath
      )
    );

    // Attempt rollback
    const rollbackResult = await attemptRollback(ctx);
    return ok(rollbackResult);
  }

  logger.info("override", Messages.override.success);
  return ok({ kind: "success" });
}

/**
 * Attempt to rollback to backup.
 */
async function attemptRollback(
  ctx: AppContext
): Promise<OverridePhaseResult> {
  const { logger, fs, config } = ctx;
  const { distPath, distBackupPath } = config;

  if (!fs.exists(distBackupPath)) {
    return { kind: "failed", message: "Zadna zaloha pro rollback" };
  }

  logger.info("override", Messages.override.rollingBack);

  // Remove failed dist
  await fs.remove(distPath, true);

  // Restore backup
  const renameResult = await fs.rename(distBackupPath, distPath);
  if (renameResult.isErr()) {
    logger.error(
      "override",
      Messages.override.rollbackFailed,
      suggestionsForOverride(
        {
          kind: "rollback_failed",
          originalError: "Copy failed",
          rollbackError: renameResult.error.message,
        },
        distPath,
        distBackupPath
      )
    );
    return {
      kind: "rollback_failed",
      message: renameResult.error.message,
    };
  }

  logger.info("override", Messages.override.rollbackSuccess);
  return { kind: "rollback_success" };
}
