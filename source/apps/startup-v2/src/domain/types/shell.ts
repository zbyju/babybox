/**
 * Shell command execution types.
 */

import type { DurationMs, DirectoryPath } from "./branded.js";

/**
 * Options for executing a shell command.
 */
export type ShellOptions = {
  readonly cwd?: DirectoryPath | undefined;
  readonly timeoutMs?: DurationMs | undefined;
  readonly env?: Readonly<Record<string, string>> | undefined;
};

/**
 * Result of executing a shell command.
 */
export type ShellResult =
  | {
      readonly kind: "success";
      readonly stdout: string;
      readonly stderr: string;
      readonly exitCode: 0;
      readonly duration: DurationMs;
    }
  | {
      readonly kind: "non_zero_exit";
      readonly stdout: string;
      readonly stderr: string;
      readonly exitCode: number;
      readonly duration: DurationMs;
    }
  | {
      readonly kind: "timeout";
      readonly stdout: string;
      readonly stderr: string;
      readonly timeoutMs: DurationMs;
    }
  | {
      readonly kind: "spawn_error";
      readonly message: string;
    };

// Constructor helpers
export const ShellResult = {
  success: (
    stdout: string,
    stderr: string,
    duration: DurationMs
  ): ShellResult => ({
    kind: "success",
    stdout,
    stderr,
    exitCode: 0,
    duration,
  }),

  nonZeroExit: (
    stdout: string,
    stderr: string,
    exitCode: number,
    duration: DurationMs
  ): ShellResult => ({
    kind: "non_zero_exit",
    stdout,
    stderr,
    exitCode,
    duration,
  }),

  timeout: (
    stdout: string,
    stderr: string,
    timeoutMs: DurationMs
  ): ShellResult => ({
    kind: "timeout",
    stdout,
    stderr,
    timeoutMs,
  }),

  spawnError: (message: string): ShellResult => ({
    kind: "spawn_error",
    message,
  }),
} as const;

/**
 * Check if shell result is successful (exit code 0).
 */
export function isShellSuccess(
  result: ShellResult
): result is ShellResult & { kind: "success" } {
  return result.kind === "success";
}

/**
 * Check if shell result has any output (success or non-zero).
 */
export function hasShellOutput(
  result: ShellResult
): result is ShellResult & { stdout: string; stderr: string } {
  return (
    result.kind === "success" ||
    result.kind === "non_zero_exit" ||
    result.kind === "timeout"
  );
}
