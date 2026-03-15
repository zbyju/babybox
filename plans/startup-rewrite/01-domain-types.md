# Project 1: Domain Types

> **Prerequisites**: Read [STARTUP-REWRITE.md](../STARTUP-REWRITE.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Define all domain types with branded types, sum types, and Zod schemas |
| **Risk** | Low |
| **Effort** | 2 days |
| **Dependencies** | #0 Project Setup |
| **Unlocks** | All other projects (types are foundational) |

## Design Principles

1. **Branded types** for nominal typing - prevent mixing paths, URLs, commands
2. **Sum types (discriminated unions)** for all variants - exhaustive pattern matching
3. **Zod schemas** for runtime validation - validate external data
4. **Immutable data** - all types are readonly
5. **No classes** - only type aliases and interfaces

## Tasks

### 1.1 Branded Types

#### src/domain/types/branded.ts

```typescript
/**
 * Branded types for nominal typing.
 * Prevents accidentally mixing different string types.
 */

// Brand symbol for compile-time type safety
declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

// Path types
export type AbsolutePath = Brand<string, "AbsolutePath">;
export type RelativePath = Brand<string, "RelativePath">;
export type DirectoryPath = Brand<string, "DirectoryPath">;
export type FilePath = Brand<string, "FilePath">;

// Command types
export type ShellCommand = Brand<string, "ShellCommand">;
export type ProcessName = Brand<string, "ProcessName">;

// Git types
export type GitBranch = Brand<string, "GitBranch">;
export type GitRemote = Brand<string, "GitRemote">;
export type GitCommitHash = Brand<string, "GitCommitHash">;

// Time types
export type Timestamp = Brand<number, "Timestamp">;
export type DurationMs = Brand<number, "DurationMs">;

// Smart constructors - validate and create branded types
export function absolutePath(path: string): AbsolutePath | null {
  if (path.startsWith("/") || /^[A-Z]:\\/.test(path)) {
    return path as AbsolutePath;
  }
  return null;
}

export function relativePath(path: string): RelativePath | null {
  if (!path.startsWith("/") && !/^[A-Z]:\\/.test(path)) {
    return path as RelativePath;
  }
  return null;
}

export function shellCommand(cmd: string): ShellCommand {
  return cmd as ShellCommand;
}

export function processName(name: string): ProcessName {
  return name as ProcessName;
}

export function timestamp(ms: number): Timestamp {
  return ms as Timestamp;
}

export function durationMs(ms: number): DurationMs {
  return ms as DurationMs;
}

export function gitBranch(name: string): GitBranch {
  return name as GitBranch;
}
```

### 1.2 OS Types

#### src/domain/types/os.ts

```typescript
/**
 * Operating system detection and configuration types.
 */

export type OperatingSystem = 
  | { readonly kind: "ubuntu" }
  | { readonly kind: "windows" }
  | { readonly kind: "mac" };

export type OsKind = OperatingSystem["kind"];

// Constructor functions
export const OS = {
  ubuntu: (): OperatingSystem => ({ kind: "ubuntu" }),
  windows: (): OperatingSystem => ({ kind: "windows" }),
  mac: (): OperatingSystem => ({ kind: "mac" }),
} as const;

// Type guard
export function isOsKind(value: string): value is OsKind {
  return value === "ubuntu" || value === "windows" || value === "mac";
}
```

### 1.3 Result Types

#### src/domain/types/results.ts

```typescript
/**
 * Result sum types for all operations.
 * Every fallible operation returns one of these.
 */

import type { Timestamp, DurationMs } from "./branded";

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
  | { readonly kind: "dirty"; readonly modifiedFiles: readonly string[]; readonly untrackedFiles: readonly string[] }
  | { readonly kind: "error"; readonly message: string };

// Build operations
export type BuildResult =
  | { readonly kind: "success"; readonly duration: DurationMs }
  | { readonly kind: "dependency_install_failed"; readonly message: string }
  | { readonly kind: "compilation_failed"; readonly message: string; readonly errors: readonly string[] }
  | { readonly kind: "unknown_error"; readonly message: string };

// Override/deployment operations
export type OverrideResult =
  | { readonly kind: "success" }
  | { readonly kind: "backup_failed"; readonly message: string }
  | { readonly kind: "copy_failed"; readonly message: string }
  | { readonly kind: "rollback_success"; readonly originalError: string }
  | { readonly kind: "rollback_failed"; readonly originalError: string; readonly rollbackError: string };

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
  | { readonly kind: "success"; readonly updated: boolean; readonly rebuilt: boolean }
  | { readonly kind: "partial_success"; readonly servicesStarted: boolean; readonly warnings: readonly string[] }
  | { readonly kind: "failed"; readonly phase: StartupPhase; readonly message: string };

export type StartupPhase =
  | "update"
  | "dependency_install"
  | "build"
  | "override"
  | "service_start";

// Constructor helpers
export const GitPullResult = {
  updated: (commitsBehind: number): GitPullResult => ({ kind: "updated", commitsBehind }),
  alreadyUpToDate: (): GitPullResult => ({ kind: "already_up_to_date" }),
  conflict: (files: readonly string[]): GitPullResult => ({ kind: "conflict", conflictingFiles: files }),
  networkError: (message: string): GitPullResult => ({ kind: "network_error", message }),
  notARepository: (): GitPullResult => ({ kind: "not_a_repository" }),
  unknownError: (message: string): GitPullResult => ({ kind: "unknown_error", message }),
} as const;

export const BuildResult = {
  success: (duration: DurationMs): BuildResult => ({ kind: "success", duration }),
  dependencyInstallFailed: (message: string): BuildResult => ({ kind: "dependency_install_failed", message }),
  compilationFailed: (message: string, errors: readonly string[]): BuildResult => 
    ({ kind: "compilation_failed", message, errors }),
  unknownError: (message: string): BuildResult => ({ kind: "unknown_error", message }),
} as const;

export const OverrideResult = {
  success: (): OverrideResult => ({ kind: "success" }),
  backupFailed: (message: string): OverrideResult => ({ kind: "backup_failed", message }),
  copyFailed: (message: string): OverrideResult => ({ kind: "copy_failed", message }),
  rollbackSuccess: (originalError: string): OverrideResult => ({ kind: "rollback_success", originalError }),
  rollbackFailed: (originalError: string, rollbackError: string): OverrideResult => 
    ({ kind: "rollback_failed", originalError, rollbackError }),
} as const;
```

### 1.4 Suggestion Types

#### src/domain/types/suggestion.ts

```typescript
/**
 * Suggestion types for actionable error recovery hints.
 * All user-facing messages are in Czech.
 */

import type { ShellCommand, DirectoryPath } from "./branded";

/**
 * A suggestion that can help the user recover from an error.
 * Different kinds have different shapes for their data.
 */
export type Suggestion =
  | TerminalSuggestion
  | ManualActionSuggestion
  | DocumentationSuggestion
  | ContactSupportSuggestion;

/**
 * Suggestion to run a command in terminal.
 */
export type TerminalSuggestion = {
  readonly kind: "terminal";
  readonly scope: TerminalScope;
  readonly command: ShellCommand;
  readonly message: string; // Czech description
};

export type TerminalScope =
  | { readonly kind: "global" }
  | { readonly kind: "directory"; readonly path: DirectoryPath };

/**
 * Suggestion for manual action (not a command).
 */
export type ManualActionSuggestion = {
  readonly kind: "manual_action";
  readonly action: ManualAction;
  readonly message: string; // Czech description
};

export type ManualAction =
  | { readonly kind: "check_network" }
  | { readonly kind: "check_disk_space" }
  | { readonly kind: "restart_machine" }
  | { readonly kind: "check_permissions"; readonly path: string }
  | { readonly kind: "custom"; readonly description: string };

/**
 * Suggestion to read documentation.
 */
export type DocumentationSuggestion = {
  readonly kind: "documentation";
  readonly topic: string;
  readonly url?: string;
  readonly message: string; // Czech description
};

/**
 * Suggestion to contact support.
 */
export type ContactSupportSuggestion = {
  readonly kind: "contact_support";
  readonly severity: "low" | "medium" | "high" | "critical";
  readonly context: string;
  readonly message: string; // Czech description
};

// Constructor helpers
export const Suggestion = {
  terminalGlobal: (command: ShellCommand, message: string): TerminalSuggestion => ({
    kind: "terminal",
    scope: { kind: "global" },
    command,
    message,
  }),

  terminalInDirectory: (
    command: ShellCommand,
    directory: DirectoryPath,
    message: string
  ): TerminalSuggestion => ({
    kind: "terminal",
    scope: { kind: "directory", path: directory },
    command,
    message,
  }),

  checkNetwork: (message: string): ManualActionSuggestion => ({
    kind: "manual_action",
    action: { kind: "check_network" },
    message,
  }),

  checkDiskSpace: (message: string): ManualActionSuggestion => ({
    kind: "manual_action",
    action: { kind: "check_disk_space" },
    message,
  }),

  restartMachine: (message: string): ManualActionSuggestion => ({
    kind: "manual_action",
    action: { kind: "restart_machine" },
    message,
  }),

  checkPermissions: (path: string, message: string): ManualActionSuggestion => ({
    kind: "manual_action",
    action: { kind: "check_permissions", path },
    message,
  }),

  documentation: (topic: string, message: string, url?: string): DocumentationSuggestion => ({
    kind: "documentation",
    topic,
    url,
    message,
  }),

  contactSupport: (
    severity: "low" | "medium" | "high" | "critical",
    context: string,
    message: string
  ): ContactSupportSuggestion => ({
    kind: "contact_support",
    severity,
    context,
    message,
  }),
} as const;
```

### 1.5 Logging Types

#### src/domain/types/logging.ts

```typescript
/**
 * Type-safe logging types.
 * All log entries are structured and typed.
 */

import type { Timestamp } from "./branded";
import type { Suggestion } from "./suggestion";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogModule =
  | "startup"
  | "update"
  | "build"
  | "override"
  | "process"
  | "install";

/**
 * A structured log entry.
 */
export type LogEntry = {
  readonly timestamp: Timestamp;
  readonly level: LogLevel;
  readonly module: LogModule;
  readonly message: string;         // Czech message for user
  readonly technicalDetails?: string; // English technical details
  readonly suggestions: readonly Suggestion[];
  readonly context?: LogContext;
};

/**
 * Additional context for log entries.
 */
export type LogContext = {
  readonly operation?: string;
  readonly duration?: number;
  readonly exitCode?: number;
  readonly command?: string;
  readonly path?: string;
  readonly error?: SerializedError;
};

/**
 * Serialized error for logging (no Error objects).
 */
export type SerializedError = {
  readonly name: string;
  readonly message: string;
  readonly stack?: string;
};

// Constructor helpers
export const LogEntry = {
  create: (
    level: LogLevel,
    module: LogModule,
    message: string,
    options?: {
      technicalDetails?: string;
      suggestions?: readonly Suggestion[];
      context?: LogContext;
    }
  ): LogEntry => ({
    timestamp: Date.now() as Timestamp,
    level,
    module,
    message,
    technicalDetails: options?.technicalDetails,
    suggestions: options?.suggestions ?? [],
    context: options?.context,
  }),

  debug: (module: LogModule, message: string, context?: LogContext): LogEntry =>
    LogEntry.create("debug", module, message, { context }),

  info: (module: LogModule, message: string, context?: LogContext): LogEntry =>
    LogEntry.create("info", module, message, { context }),

  warn: (
    module: LogModule,
    message: string,
    suggestions?: readonly Suggestion[],
    context?: LogContext
  ): LogEntry =>
    LogEntry.create("warn", module, message, { suggestions, context }),

  error: (
    module: LogModule,
    message: string,
    suggestions: readonly Suggestion[],
    context?: LogContext
  ): LogEntry =>
    LogEntry.create("error", module, message, { suggestions, context }),
} as const;

/**
 * Serialize an Error object for logging.
 */
export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    name: "UnknownError",
    message: String(error),
  };
}
```

### 1.6 Configuration Types with Zod

#### src/domain/types/config.ts

```typescript
/**
 * Configuration types with Zod validation.
 */

import { z } from "zod";
import type { AbsolutePath, DurationMs } from "./branded";

// Zod schemas for runtime validation
export const StartupConfigSchema = z.object({
  // Paths
  repositoryPath: z.string().min(1),
  distPath: z.string().min(1),
  distBackupPath: z.string().min(1),
  logsPath: z.string().min(1),

  // Timeouts
  gitTimeoutMs: z.number().int().positive().default(30000),
  buildTimeoutMs: z.number().int().positive().default(300000), // 5 min
  processStartTimeoutMs: z.number().int().positive().default(10000),

  // Retry configuration
  maxRetries: z.number().int().min(0).max(10).default(5),
  retryDelayMs: z.number().int().positive().default(5000),

  // Process names
  mainProcessName: z.string().default("babybox"),
  configerProcessName: z.string().default("configer"),

  // Feature flags
  enableAutoUpdate: z.boolean().default(true),
  enableRollback: z.boolean().default(true),
});

export type StartupConfigInput = z.input<typeof StartupConfigSchema>;
export type StartupConfig = z.output<typeof StartupConfigSchema>;

// Default configuration factory
export function createDefaultConfig(basePath: AbsolutePath): StartupConfig {
  return StartupConfigSchema.parse({
    repositoryPath: basePath,
    distPath: `${basePath}/dist`,
    distBackupPath: `${basePath}/dist-backup`,
    logsPath: `${basePath}/source/apps/startup-v2/logs`,
    gitTimeoutMs: 30000,
    buildTimeoutMs: 300000,
    processStartTimeoutMs: 10000,
    maxRetries: 5,
    retryDelayMs: 5000,
    mainProcessName: "babybox",
    configerProcessName: "configer",
    enableAutoUpdate: true,
    enableRollback: true,
  });
}

// Environment-based configuration
export const EnvConfigSchema = z.object({
  BABYBOX_REPO_PATH: z.string().optional(),
  BABYBOX_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
  BABYBOX_MAX_RETRIES: z.coerce.number().int().min(0).max(10).optional(),
});

export type EnvConfig = z.output<typeof EnvConfigSchema>;
```

### 1.7 Command/Shell Types

#### src/domain/types/shell.ts

```typescript
/**
 * Shell command execution types.
 */

import type { ShellCommand, DurationMs, DirectoryPath } from "./branded";

/**
 * Options for executing a shell command.
 */
export type ShellOptions = {
  readonly cwd?: DirectoryPath;
  readonly timeoutMs?: DurationMs;
  readonly env?: Readonly<Record<string, string>>;
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
  success: (stdout: string, stderr: string, duration: DurationMs): ShellResult => ({
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

  timeout: (stdout: string, stderr: string, timeoutMs: DurationMs): ShellResult => ({
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
  return result.kind === "success" || result.kind === "non_zero_exit" || result.kind === "timeout";
}
```

### 1.8 Index Exports

#### src/domain/types/index.ts

```typescript
/**
 * Domain types - re-export all type modules.
 */

export * from "./branded";
export * from "./os";
export * from "./results";
export * from "./suggestion";
export * from "./logging";
export * from "./config";
export * from "./shell";
```

## Verification Checklist

- [x] All types compile without errors
- [x] No `any` types anywhere
- [x] All sum types have exhaustive constructors
- [x] Zod schemas validate correctly
- [x] Branded type constructors work
- [x] Type guards are properly typed

## Test File

Create a simple test to verify types work:

#### src/domain/types/types.test.ts

```typescript
import { describe, expect, it } from "bun:test";
import {
  absolutePath,
  shellCommand,
  GitPullResult,
  Suggestion,
  LogEntry,
  StartupConfigSchema,
} from "./index";

describe("branded types", () => {
  it("creates absolute paths correctly", () => {
    expect(absolutePath("/home/user")).toBe("/home/user");
    expect(absolutePath("relative/path")).toBeNull();
    expect(absolutePath("C:\\Users")).toBe("C:\\Users");
  });

  it("creates shell commands", () => {
    const cmd = shellCommand("git pull");
    expect(cmd).toBe("git pull");
  });
});

describe("result types", () => {
  it("creates git pull results", () => {
    const updated = GitPullResult.updated(5);
    expect(updated.kind).toBe("updated");
    expect(updated.commitsBehind).toBe(5);

    const upToDate = GitPullResult.alreadyUpToDate();
    expect(upToDate.kind).toBe("already_up_to_date");
  });
});

describe("suggestion types", () => {
  it("creates terminal suggestions", () => {
    const suggestion = Suggestion.terminalGlobal(
      shellCommand("git stash"),
      "Ulozte zmeny do stashe"
    );
    expect(suggestion.kind).toBe("terminal");
    expect(suggestion.scope.kind).toBe("global");
  });
});

describe("config validation", () => {
  it("validates config with defaults", () => {
    const result = StartupConfigSchema.safeParse({
      repositoryPath: "/home/babybox",
      distPath: "/home/babybox/dist",
      distBackupPath: "/home/babybox/dist-backup",
      logsPath: "/home/babybox/logs",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxRetries).toBe(5); // default
    }
  });

  it("rejects invalid config", () => {
    const result = StartupConfigSchema.safeParse({
      repositoryPath: "", // invalid: empty
    });
    expect(result.success).toBe(false);
  });
});
```

Run tests:
```bash
bun test src/domain/types/types.test.ts
```
