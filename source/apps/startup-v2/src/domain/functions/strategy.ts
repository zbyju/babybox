/**
 * Strategy determination functions.
 * Pure functions that decide what actions to take based on state.
 */

import type {
  GitPullResult,
  GitStatusResult,
  BuildResult,
  OverrideResult,
} from "../types/results";
import type { StartupConfig } from "../types/config";

/**
 * What to do after a git pull result.
 */
export type PullStrategy =
  | { readonly kind: "proceed_with_build" }
  | { readonly kind: "skip_build"; readonly reason: string }
  | { readonly kind: "stash_and_retry" }
  | { readonly kind: "reset_and_retry" }
  | { readonly kind: "abort"; readonly reason: string };

/**
 * Determine strategy based on git pull result.
 */
export function determinePullStrategy(result: GitPullResult): PullStrategy {
  switch (result.kind) {
    case "updated":
      return { kind: "proceed_with_build" };

    case "already_up_to_date":
      return { kind: "skip_build", reason: "Zadne nove zmeny k sestaveni" };

    case "conflict":
      // Stash local changes and retry
      return { kind: "stash_and_retry" };

    case "network_error":
      // Continue with existing code
      return {
        kind: "skip_build",
        reason: "Sit nedostupna, pouzivam existujici kod",
      };

    case "not_a_repository":
      return { kind: "abort", reason: "Adresar neni git repozitar" };

    case "unknown_error":
      // Try to continue with existing code
      return {
        kind: "skip_build",
        reason: `Neznama chyba pri aktualizaci: ${result.message}`,
      };
  }
}

/**
 * What to do when there are local changes before pull.
 */
export type LocalChangesStrategy =
  | { readonly kind: "stash" }
  | { readonly kind: "discard" }
  | { readonly kind: "abort" };

/**
 * Determine what to do with local changes.
 */
export function determineLocalChangesStrategy(_status: GitStatusResult): LocalChangesStrategy {
  // Always stash to preserve local changes
  return { kind: "stash" };
}

/**
 * Whether to attempt a build.
 */
export type BuildDecision =
  | { readonly kind: "build" }
  | { readonly kind: "skip"; readonly reason: string };

/**
 * Decide whether to build based on current state.
 */
export function decideBuild(
  pullResult: GitPullResult,
  distExists: boolean,
  config: StartupConfig,
): BuildDecision {
  // If auto-update is disabled and dist exists, skip
  if (!config.enableAutoUpdate && distExists) {
    return { kind: "skip", reason: "Auto-update vypnuty" };
  }

  // If no dist exists, must build
  if (!distExists) {
    return { kind: "build" };
  }

  // If updated, must build
  if (pullResult.kind === "updated") {
    return { kind: "build" };
  }

  // Otherwise skip
  return { kind: "skip", reason: "Neni potreba novy build" };
}

/**
 * What to do after a build failure.
 */
export type BuildFailureStrategy =
  | { readonly kind: "rollback" }
  | { readonly kind: "use_existing" }
  | { readonly kind: "abort" };

/**
 * Determine strategy after build failure.
 */
export function determineBuildFailureStrategy(
  _result: BuildResult,
  distBackupExists: boolean,
  config: StartupConfig,
): BuildFailureStrategy {
  // If rollback is disabled, just use existing
  if (!config.enableRollback) {
    return { kind: "use_existing" };
  }

  // If backup exists, rollback
  if (distBackupExists) {
    return { kind: "rollback" };
  }

  // No backup, try to use existing dist
  return { kind: "use_existing" };
}

/**
 * What to do after override failure.
 */
export type OverrideFailureStrategy = { readonly kind: "rollback" } | { readonly kind: "abort" };

/**
 * Determine strategy after override failure.
 */
export function determineOverrideFailureStrategy(
  _result: OverrideResult,
  distBackupExists: boolean,
): OverrideFailureStrategy {
  if (distBackupExists) {
    return { kind: "rollback" };
  }

  return { kind: "abort" };
}
