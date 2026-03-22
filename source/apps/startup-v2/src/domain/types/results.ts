/**
 * Result sum types for all operations.
 * Every fallible operation returns one of these.
 */

import type { DurationMs } from "./branded";

// Git operations
export type GitPullResult =
  | { readonly kind: "updated"; readonly commitsBehind: number }
  | { readonly kind: "already_up_to_date" }
  | { readonly kind: "conflict"; readonly conflictingFiles: readonly string[] }
  | { readonly kind: "network_error"; readonly message: string }
  | { readonly kind: "not_a_repository" }
  | { readonly kind: "unknown_error"; readonly message: string };

export type GitStashResult =
  | { readonly kind: "stashed"; readonly stashName: string }
  | { readonly kind: "nothing_to_stash" }
  | { readonly kind: "error"; readonly message: string };

export type GitStatusResult =
  | { readonly kind: "clean" }
  | {
      readonly kind: "dirty";
      readonly modifiedFiles: readonly string[];
      readonly untrackedFiles: readonly string[];
    }
  | { readonly kind: "error"; readonly message: string };

// Build operations
export type BuildResult =
  | { readonly kind: "success"; readonly duration: DurationMs }
  | { readonly kind: "dependency_install_failed"; readonly message: string }
  | {
      readonly kind: "compilation_failed";
      readonly message: string;
      readonly errors: readonly string[];
    }
  | { readonly kind: "unknown_error"; readonly message: string };

// Override/deployment operations
export type OverrideResult =
  | { readonly kind: "success" }
  | { readonly kind: "backup_failed"; readonly message: string }
  | { readonly kind: "copy_failed"; readonly message: string }
  | { readonly kind: "rollback_success"; readonly originalError: string }
  | {
      readonly kind: "rollback_failed";
      readonly originalError: string;
      readonly rollbackError: string;
    };

// Process operations
export type ProcessStartResult =
  | { readonly kind: "started"; readonly pid: number }
  | { readonly kind: "already_running"; readonly pid: number }
  | { readonly kind: "failed"; readonly message: string };

export type ProcessStopResult =
  | { readonly kind: "stopped" }
  | { readonly kind: "not_running" }
  | { readonly kind: "failed"; readonly message: string };

// Dependency installation
export type DependencyInstallResult =
  | { readonly kind: "success" }
  | { readonly kind: "bun_not_found" }
  | { readonly kind: "install_failed"; readonly message: string };

// Overall startup result
export type StartupResult =
  | {
      readonly kind: "success";
      readonly updated: boolean;
      readonly rebuilt: boolean;
    }
  | {
      readonly kind: "partial_success";
      readonly servicesStarted: boolean;
      readonly warnings: readonly string[];
    }
  | {
      readonly kind: "failed";
      readonly phase: StartupPhase;
      readonly message: string;
    };

export type StartupPhase = "update" | "dependency_install" | "build" | "override" | "service_start";

// Constructor helpers
export const GitPullResult = {
  updated: (commitsBehind: number): GitPullResult => ({
    kind: "updated",
    commitsBehind,
  }),
  alreadyUpToDate: (): GitPullResult => ({ kind: "already_up_to_date" }),
  conflict: (files: readonly string[]): GitPullResult => ({
    kind: "conflict",
    conflictingFiles: files,
  }),
  networkError: (message: string): GitPullResult => ({
    kind: "network_error",
    message,
  }),
  notARepository: (): GitPullResult => ({ kind: "not_a_repository" }),
  unknownError: (message: string): GitPullResult => ({
    kind: "unknown_error",
    message,
  }),
} as const;

export const BuildResult = {
  success: (duration: DurationMs): BuildResult => ({
    kind: "success",
    duration,
  }),
  dependencyInstallFailed: (message: string): BuildResult => ({
    kind: "dependency_install_failed",
    message,
  }),
  compilationFailed: (message: string, errors: readonly string[]): BuildResult => ({
    kind: "compilation_failed",
    message,
    errors,
  }),
  unknownError: (message: string): BuildResult => ({
    kind: "unknown_error",
    message,
  }),
} as const;

export const OverrideResult = {
  success: (): OverrideResult => ({ kind: "success" }),
  backupFailed: (message: string): OverrideResult => ({
    kind: "backup_failed",
    message,
  }),
  copyFailed: (message: string): OverrideResult => ({
    kind: "copy_failed",
    message,
  }),
  rollbackSuccess: (originalError: string): OverrideResult => ({
    kind: "rollback_success",
    originalError,
  }),
  rollbackFailed: (originalError: string, rollbackError: string): OverrideResult => ({
    kind: "rollback_failed",
    originalError,
    rollbackError,
  }),
} as const;
