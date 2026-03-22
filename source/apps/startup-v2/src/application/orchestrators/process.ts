/**
 * Process orchestrator - handles starting services via PM2.
 */

import { type Result, ok } from "neverthrow";
import type { AppContext } from "../context";
import type { DirectoryPath, ProcessName } from "../../domain/types/branded";
import { processName } from "../../domain/types/branded";
import { shouldRetryProcessStart } from "../../domain/functions/retry";
import { suggestionsForProcessStart } from "../../domain/functions/suggestion";
import { Messages } from "../../presentation/messages";

export type ProcessPhaseResult =
  | { readonly kind: "success"; readonly servicesStarted: readonly string[] }
  | {
      readonly kind: "partial";
      readonly started: readonly string[];
      readonly failed: readonly string[];
    }
  | { readonly kind: "failed"; readonly message: string };

/**
 * Execute the process start phase.
 * Starts all required services via PM2.
 */
export async function executeProcessStart(
  ctx: AppContext,
): Promise<Result<ProcessPhaseResult, string>> {
  const { logger, process, config } = ctx;
  const distPath = config.distPath as DirectoryPath;

  // Check if PM2 is installed
  const pm2Installed = await process.isManagerInstalled();
  if (!pm2Installed) {
    logger.error("process", "PM2 neni nainstalovan", []);
    return ok({ kind: "failed", message: "PM2 neni nainstalovan" });
  }

  const started: string[] = [];
  const failed: string[] = [];

  // Start main process (babybox)
  const mainName = processName(config.mainProcessName);
  const mainResult = await startServiceWithRetry(
    ctx,
    mainName,
    "apps/backend/src/index.ts",
    distPath,
  );

  if (mainResult.success) {
    started.push(config.mainProcessName);
  } else {
    failed.push(config.mainProcessName);
  }

  // Determine result
  if (failed.length === 0) {
    return ok({ kind: "success", servicesStarted: started });
  }

  if (started.length > 0) {
    return ok({ kind: "partial", started, failed });
  }

  return ok({ kind: "failed", message: "Vsechny sluzby selhaly" });
}

/**
 * Start a service with retry logic.
 */
async function startServiceWithRetry(
  ctx: AppContext,
  name: ProcessName,
  scriptPath: string,
  cwd: DirectoryPath,
): Promise<{ success: boolean }> {
  const { logger, process, config } = ctx;
  const maxAttempts = config.maxRetries;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      logger.info("process", Messages.process.retrying(name as string, attempt + 1));
    } else {
      logger.info("process", Messages.process.starting(name as string));
    }

    const result = await process.startBun(name, scriptPath, cwd);

    if (result.isErr()) {
      logger.error("process", Messages.process.failed(name as string), [], {
        error: { name: "ProcessError", message: result.error.message },
      });
      continue;
    }

    const startResult = result.value;

    switch (startResult.kind) {
      case "started":
        logger.info("process", Messages.process.started(name as string));
        return { success: true };

      case "already_running":
        logger.info("process", Messages.process.alreadyRunning(name as string));
        return { success: true };

      case "failed": {
        const retryDecision = shouldRetryProcessStart(startResult, attempt);
        if (retryDecision.kind === "give_up") {
          logger.error(
            "process",
            Messages.process.failed(name as string),
            suggestionsForProcessStart(startResult, name as string),
          );
          return { success: false };
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, retryDecision.delayMs));
        break;
      }
    }
  }

  return { success: false };
}
