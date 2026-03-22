/**
 * Retry logic functions.
 * Pure functions for determining retry behavior.
 */

import type { ShellResult, ProcessStartResult, GitPullResult } from "../types/index";

/**
 * Configuration for retry behavior.
 */
export type RetryConfig = {
  readonly maxAttempts: number;
  readonly delayMs: number;
  readonly backoffMultiplier: number;
  readonly maxDelayMs: number;
};

/**
 * Default retry configuration.
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 5,
  delayMs: 5000,
  backoffMultiplier: 1.5,
  maxDelayMs: 30000,
};

/**
 * Whether an operation should be retried.
 */
export type RetryDecision =
  | { readonly kind: "retry"; readonly delayMs: number }
  | { readonly kind: "give_up"; readonly reason: string };

/**
 * Determine if a shell command should be retried.
 */
export function shouldRetryShellCommand(
  result: ShellResult,
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): RetryDecision {
  // Max attempts reached
  if (attempt >= config.maxAttempts) {
    return {
      kind: "give_up",
      reason: `Maximalni pocet pokusu (${config.maxAttempts}) vycerpan`,
    };
  }

  switch (result.kind) {
    case "success":
      // Success, no retry needed
      return { kind: "give_up", reason: "Operace uspesna" };

    case "timeout":
      // Timeout is often transient, retry with backoff
      return {
        kind: "retry",
        delayMs: calculateBackoff(attempt, config),
      };

    case "spawn_error":
      // Spawn errors are usually permanent (binary not found, etc.)
      return { kind: "give_up", reason: `Spawn chyba: ${result.message}` };

    case "non_zero_exit":
      // Some exit codes are retryable, some are not
      if (isRetryableExitCode(result.exitCode)) {
        return {
          kind: "retry",
          delayMs: calculateBackoff(attempt, config),
        };
      }
      return {
        kind: "give_up",
        reason: `Permanentni chyba s kodem ${result.exitCode}`,
      };
  }
}

/**
 * Determine if a process start should be retried.
 */
export function shouldRetryProcessStart(
  result: ProcessStartResult,
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): RetryDecision {
  if (attempt >= config.maxAttempts) {
    return {
      kind: "give_up",
      reason: `Maximalni pocet pokusu (${config.maxAttempts}) vycerpan`,
    };
  }

  switch (result.kind) {
    case "started":
    case "already_running":
      // Success, no retry needed
      return { kind: "give_up", reason: "Proces bezi" };

    case "failed":
      // Process start failures might be transient
      return {
        kind: "retry",
        delayMs: calculateBackoff(attempt, config),
      };
  }
}

/**
 * Determine if a git pull should be retried.
 */
export function shouldRetryGitPull(
  result: GitPullResult,
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): RetryDecision {
  if (attempt >= config.maxAttempts) {
    return {
      kind: "give_up",
      reason: `Maximalni pocet pokusu (${config.maxAttempts}) vycerpan`,
    };
  }

  switch (result.kind) {
    case "updated":
    case "already_up_to_date":
      return { kind: "give_up", reason: "Aktualizace uspesna" };

    case "network_error":
      // Network errors are often transient
      return {
        kind: "retry",
        delayMs: calculateBackoff(attempt, config),
      };

    case "conflict":
      // Conflicts require intervention, don't retry the same operation
      return { kind: "give_up", reason: "Konflikt vyzaduje zasah" };

    case "not_a_repository":
      // Permanent error
      return { kind: "give_up", reason: "Neni git repozitar" };

    case "unknown_error":
      // Unknown errors might be transient, try once more
      if (attempt < 2) {
        return {
          kind: "retry",
          delayMs: calculateBackoff(attempt, config),
        };
      }
      return { kind: "give_up", reason: result.message };
  }
}

/**
 * Calculate backoff delay for a given attempt.
 */
export function calculateBackoff(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): number {
  const delay = config.delayMs * config.backoffMultiplier ** attempt;
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Exit codes that indicate transient failures.
 */
function isRetryableExitCode(code: number): boolean {
  // Common transient error codes
  const retryableCodes = [
    1, // General errors (often transient)
    75, // Temporary failure
    128, // Invalid exit argument (git specific)
  ];
  return retryableCodes.includes(code);
}
