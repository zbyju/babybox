/**
 * Main startup orchestrator - coordinates all phases.
 */

import { type Result, ok } from "neverthrow";
import type { AppContext } from "../context";
import type { StartupResult } from "../../domain/types/results";
import { decideBuild } from "../../domain/functions/strategy";
import { Messages } from "../../presentation/messages";
import { executeUpdate } from "./update";
import { executeBuild } from "./build";
import { executeOverride } from "./override";
import { executeProcessStart } from "./process";

/**
 * Execute the complete startup flow.
 *
 * Phases:
 * 1. Update - git pull with conflict resolution
 * 2. Build - install dependencies and compile (if needed)
 * 3. Override - deploy new build to dist (if built)
 * 4. Process - start services via PM2
 */
export async function startup(ctx: AppContext): Promise<Result<StartupResult, string>> {
  const { logger, fs, config } = ctx;

  logger.info("startup", Messages.startup.starting);

  // Phase 1: Update
  const updateResult = await executeUpdate(ctx);
  if (updateResult.isErr()) {
    return ok({
      kind: "failed",
      phase: "update",
      message: updateResult.error,
    });
  }

  const update = updateResult.value;
  const wasUpdated = update.kind === "updated";

  // Phase 2: Decide if we need to build
  const distExists = fs.exists(config.distPath);
  const pullResult =
    update.kind === "updated"
      ? { kind: "updated" as const, commitsBehind: update.commitsBehind }
      : { kind: "already_up_to_date" as const };

  const buildDecision = decideBuild(pullResult, distExists, config);
  const shouldBuild = buildDecision.kind === "build";

  // Phase 3: Build (if needed)
  const buildResult = await executeBuild(
    ctx,
    shouldBuild,
    buildDecision.kind === "skip" ? buildDecision.reason : undefined,
  );

  if (buildResult.isErr()) {
    return ok({
      kind: "failed",
      phase: "build",
      message: buildResult.error,
    });
  }

  const build = buildResult.value;
  const wasBuilt = build.kind === "success";

  if (build.kind === "failed") {
    // Build failed, try to continue with existing dist
    if (!distExists) {
      return ok({
        kind: "failed",
        phase: "build",
        message: build.message,
      });
    }
    // Continue with existing dist
    logger.warn("build", "Build selhal, pouzivam existujici dist", []);
  }

  // Phase 4: Override (if built successfully)
  const overrideResult = await executeOverride(ctx, wasBuilt);

  if (overrideResult.isErr()) {
    return ok({
      kind: "failed",
      phase: "override",
      message: overrideResult.error,
    });
  }

  const override = overrideResult.value;
  if (override.kind === "failed" || override.kind === "rollback_failed") {
    if (!distExists) {
      return ok({
        kind: "failed",
        phase: "override",
        message: override.message,
      });
    }
    // Continue with existing/restored dist
  }

  // Phase 5: Start processes
  const processResult = await executeProcessStart(ctx);

  if (processResult.isErr()) {
    return ok({
      kind: "failed",
      phase: "service_start",
      message: processResult.error,
    });
  }

  const processPhase = processResult.value;

  // Determine final result
  if (processPhase.kind === "failed") {
    return ok({
      kind: "failed",
      phase: "service_start",
      message: processPhase.message,
    });
  }

  if (processPhase.kind === "partial") {
    logger.warn("startup", `Nektere sluzby selhaly: ${processPhase.failed.join(", ")}`, []);
    return ok({
      kind: "partial_success",
      servicesStarted: processPhase.started.length > 0,
      warnings: [`Selhaly sluzby: ${processPhase.failed.join(", ")}`],
    });
  }

  logger.info("startup", Messages.startup.completed);

  return ok({
    kind: "success",
    updated: wasUpdated,
    rebuilt: wasBuilt,
  });
}
