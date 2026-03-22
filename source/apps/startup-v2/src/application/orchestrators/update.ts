/**
 * Update orchestrator - handles git pull and conflict resolution.
 */

import { type Result, ok, err } from "neverthrow";
import type { AppContext } from "../context";
import type { GitPullResult, DirectoryPath } from "../../domain/types/index";
import { determinePullStrategy, shouldRetryGitPull } from "../../domain/functions/index";
import { suggestionsForGitPull } from "../../domain/functions/index";
import { Messages } from "../../presentation/messages";

export type UpdateResult =
  | { readonly kind: "updated"; readonly commitsBehind: number }
  | { readonly kind: "already_up_to_date" }
  | { readonly kind: "skipped"; readonly reason: string }
  | { readonly kind: "failed"; readonly message: string };

/**
 * Execute the update phase.
 * Handles git pull with automatic conflict resolution via stash.
 */
export async function executeUpdate(ctx: AppContext): Promise<Result<UpdateResult, string>> {
  const { logger, git, config } = ctx;
  const repoPath = config.repositoryPath as DirectoryPath;

  logger.info("update", Messages.update.checking);

  // First, check git status
  const statusResult = await git.status();
  if (statusResult.isErr()) {
    logger.error("update", "Nelze zkontrolovat stav repozitare", [], {
      error: { name: "GitError", message: statusResult.error },
    });
    return err(statusResult.error);
  }

  const status = statusResult.value;

  // If there are local changes, stash them
  if (status.kind === "dirty") {
    logger.info("update", Messages.update.stashingChanges);
    const stashResult = await git.stash();
    if (stashResult.isErr()) {
      logger.warn("update", Messages.update.stashFailed, []);
      // Continue anyway, pull might work
    } else if (stashResult.value.kind === "stashed") {
      logger.info("update", Messages.update.stashSuccess);
    }
  }

  // Execute git pull with retries
  logger.info("update", Messages.update.pulling);
  let pullResult: GitPullResult | null = null;
  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    const result = await git.pull();
    if (result.isErr()) {
      logger.error("update", `Git pull selhal: ${result.error}`, [], {
        error: { name: "GitError", message: result.error },
      });
      return err(result.error);
    }

    pullResult = result.value;
    const strategy = determinePullStrategy(pullResult);

    switch (strategy.kind) {
      case "proceed_with_build":
        if (pullResult.kind === "updated") {
          logger.info("update", Messages.update.updated(pullResult.commitsBehind));
          return ok({ kind: "updated", commitsBehind: pullResult.commitsBehind });
        }
        return ok({ kind: "already_up_to_date" });

      case "skip_build":
        if (pullResult.kind === "already_up_to_date") {
          logger.info("update", Messages.update.upToDate);
          return ok({ kind: "already_up_to_date" });
        }
        logger.info("update", strategy.reason);
        return ok({ kind: "skipped", reason: strategy.reason });

      case "stash_and_retry":
        // Already stashed above, try reset
        logger.warn("update", Messages.update.conflictDetected, []);
        await git.resetHard();
        attempt++;
        continue;

      case "abort":
        logger.error("update", strategy.reason, suggestionsForGitPull(pullResult, repoPath));
        return err(strategy.reason);

      case "reset_and_retry":
        await git.resetHard();
        attempt++;
        continue;
    }

    // Check if we should retry
    const retryDecision = shouldRetryGitPull(pullResult, attempt);
    if (retryDecision.kind === "give_up") {
      break;
    }

    // Wait before retry - retryDecision must be "retry" here
    await new Promise((resolve) => {
      // TypeScript narrowing workaround
      const delay = (retryDecision as { kind: "retry"; delayMs: number }).delayMs;
      setTimeout(resolve, delay);
    });
    attempt++;
  }

  // If we get here, all retries failed
  if (pullResult) {
    const suggestions = suggestionsForGitPull(pullResult, repoPath);
    logger.error("update", "Aktualizace selhala po vsech pokusech", suggestions);
  }

  return ok({ kind: "skipped", reason: "Pouzivam existujici kod" });
}
