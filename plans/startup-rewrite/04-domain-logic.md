# Project 4: Domain Logic

> **Prerequisites**: Read [STARTUP-REWRITE.md](../STARTUP-REWRITE.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Implement pure domain functions for decision-making and transformations |
| **Risk** | Low |
| **Effort** | 2 days |
| **Dependencies** | #1 Domain Types, #2 Logging System |
| **Unlocks** | Application layer orchestration |

## Design Principles

1. **Pure functions** - No side effects, same input = same output
2. **No I/O** - Domain functions don't call APIs, file systems, or network
3. **Total functions** - Every input produces a valid output (no exceptions)
4. **Exhaustive matching** - Handle all cases of sum types
5. **Business logic only** - Decision-making, validation, transformation

## Tasks

### 4.1 Update Strategy Functions

#### src/domain/functions/strategy.ts

```typescript
/**
 * Strategy determination functions.
 * Pure functions that decide what actions to take based on state.
 */

import type {
  GitPullResult,
  GitStatusResult,
  BuildResult,
  OverrideResult,
  StartupConfig,
} from "@domain/types";

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
export function determineLocalChangesStrategy(
  status: GitStatusResult
): LocalChangesStrategy {
  switch (status.kind) {
    case "clean":
      // No local changes, nothing to do
      // This shouldn't be called in clean state, but handle gracefully
      return { kind: "stash" };

    case "dirty":
      // Stash changes to preserve them
      return { kind: "stash" };

    case "error":
      // If we can't determine status, try to stash anyway
      return { kind: "stash" };
  }
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
  config: StartupConfig
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
  result: BuildResult,
  distBackupExists: boolean,
  config: StartupConfig
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
export type OverrideFailureStrategy =
  | { readonly kind: "rollback" }
  | { readonly kind: "abort" };

/**
 * Determine strategy after override failure.
 */
export function determineOverrideFailureStrategy(
  result: OverrideResult,
  distBackupExists: boolean
): OverrideFailureStrategy {
  if (distBackupExists) {
    return { kind: "rollback" };
  }

  return { kind: "abort" };
}
```

### 4.2 Retry Logic Functions

#### src/domain/functions/retry.ts

```typescript
/**
 * Retry logic functions.
 * Pure functions for determining retry behavior.
 */

import type { ShellResult, ProcessStartResult, GitPullResult } from "@domain/types";

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
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): RetryDecision {
  // Max attempts reached
  if (attempt >= config.maxAttempts) {
    return { kind: "give_up", reason: `Maximalni pocet pokusu (${config.maxAttempts}) vycerpan` };
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
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): RetryDecision {
  if (attempt >= config.maxAttempts) {
    return { kind: "give_up", reason: `Maximalni pocet pokusu (${config.maxAttempts}) vycerpan` };
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
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): RetryDecision {
  if (attempt >= config.maxAttempts) {
    return { kind: "give_up", reason: `Maximalni pocet pokusu (${config.maxAttempts}) vycerpan` };
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
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = config.delayMs * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Exit codes that indicate transient failures.
 */
function isRetryableExitCode(code: number): boolean {
  // Common transient error codes
  const retryableCodes = [
    1,   // General errors (often transient)
    75,  // Temporary failure
    128, // Invalid exit argument (git specific)
  ];
  return retryableCodes.includes(code);
}
```

### 4.3 Suggestion Creation Functions

#### src/domain/functions/suggestion.ts

```typescript
/**
 * Suggestion creation functions.
 * Pure functions that create actionable suggestions based on errors.
 */

import type {
  Suggestion,
  GitPullResult,
  BuildResult,
  OverrideResult,
  ProcessStartResult,
  DirectoryPath,
} from "@domain/types";
import { Suggestion as S, shellCommand } from "@domain/types";

/**
 * Create suggestions for git pull failures.
 */
export function suggestionsForGitPull(
  result: GitPullResult,
  repoPath: DirectoryPath
): readonly Suggestion[] {
  switch (result.kind) {
    case "updated":
    case "already_up_to_date":
      return [];

    case "conflict":
      return [
        S.terminalInDirectory(
          shellCommand("git stash"),
          repoPath,
          "Ulozte lokalni zmeny do stashe"
        ),
        S.terminalInDirectory(
          shellCommand("git pull"),
          repoPath,
          "Zkuste znovu stahnout zmeny"
        ),
        S.terminalInDirectory(
          shellCommand("git stash pop"),
          repoPath,
          "Obnovte ulozene zmeny"
        ),
      ];

    case "network_error":
      return [
        S.checkNetwork("Zkontrolujte pripojeni k internetu"),
        S.terminalGlobal(
          shellCommand("ping github.com"),
          "Overdte pripojeni k serveru"
        ),
      ];

    case "not_a_repository":
      return [
        S.terminalInDirectory(
          shellCommand("git init"),
          repoPath,
          "Inicializujte git repozitar"
        ),
        S.terminalInDirectory(
          shellCommand("git clone <url> ."),
          repoPath,
          "Naklonujte repozitar znovu"
        ),
      ];

    case "unknown_error":
      return [
        S.terminalInDirectory(
          shellCommand("git status"),
          repoPath,
          "Zkontrolujte stav repozitare"
        ),
        S.terminalInDirectory(
          shellCommand("git fetch --all"),
          repoPath,
          "Zkuste stahnout metadata"
        ),
        S.contactSupport(
          "medium",
          result.message,
          "Pokud problem pretrva, kontaktujte podporu"
        ),
      ];
  }
}

/**
 * Create suggestions for build failures.
 */
export function suggestionsForBuild(
  result: BuildResult,
  repoPath: DirectoryPath
): readonly Suggestion[] {
  switch (result.kind) {
    case "success":
      return [];

    case "dependency_install_failed":
      return [
        S.terminalInDirectory(
          shellCommand("rm -rf node_modules"),
          repoPath,
          "Smazte node_modules a zkuste znovu"
        ),
        S.terminalInDirectory(
          shellCommand("bun install"),
          repoPath,
          "Nainstalujte zavislosti rucne"
        ),
        S.checkDiskSpace("Zkontrolujte volne misto na disku"),
        S.checkNetwork("Zkontrolujte pripojeni k npm registry"),
      ];

    case "compilation_failed":
      return [
        S.terminalInDirectory(
          shellCommand("bun run typecheck"),
          repoPath,
          "Zkontrolujte typove chyby"
        ),
        S.documentation(
          "TypeScript errors",
          "Projdete si chybove hlasky a opravte problemy ve zdrojovem kodu"
        ),
        S.contactSupport(
          "high",
          result.errors.join("; "),
          "Kompilace selhala - kontaktujte vyvojare"
        ),
      ];

    case "unknown_error":
      return [
        S.terminalInDirectory(
          shellCommand("bun run build"),
          repoPath,
          "Zkuste build spustit rucne"
        ),
        S.contactSupport(
          "medium",
          result.message,
          "Neznama chyba pri buildu - kontaktujte podporu"
        ),
      ];
  }
}

/**
 * Create suggestions for override/deployment failures.
 */
export function suggestionsForOverride(
  result: OverrideResult,
  distPath: string,
  backupPath: string
): readonly Suggestion[] {
  switch (result.kind) {
    case "success":
    case "rollback_success":
      return [];

    case "backup_failed":
      return [
        S.checkDiskSpace("Zkontrolujte volne misto na disku"),
        S.checkPermissions(distPath, `Zkontrolujte opravneni k ${distPath}`),
        S.terminalGlobal(
          shellCommand(`rm -rf ${backupPath}`),
          "Smazte starou zalohu a zkuste znovu"
        ),
      ];

    case "copy_failed":
      return [
        S.checkDiskSpace("Zkontrolujte volne misto na disku"),
        S.checkPermissions(distPath, `Zkontrolujte opravneni k ${distPath}`),
      ];

    case "rollback_failed":
      return [
        S.contactSupport(
          "critical",
          `Original: ${result.originalError}, Rollback: ${result.rollbackError}`,
          "KRITICKA CHYBA: Rollback selhal! Kontaktujte okamzite podporu."
        ),
        S.terminalGlobal(
          shellCommand(`cp -r ${backupPath} ${distPath}`),
          "Zkuste rucne obnovit ze zalohy"
        ),
        S.restartMachine("Restartujte pocitac a zkontrolujte stav"),
      ];
  }
}

/**
 * Create suggestions for process start failures.
 */
export function suggestionsForProcessStart(
  result: ProcessStartResult,
  processName: string
): readonly Suggestion[] {
  switch (result.kind) {
    case "started":
    case "already_running":
      return [];

    case "failed":
      return [
        S.terminalGlobal(
          shellCommand("pm2 list"),
          "Zkontrolujte stav vsech procesu"
        ),
        S.terminalGlobal(
          shellCommand(`pm2 logs ${processName}`),
          "Zkontrolujte logy procesu"
        ),
        S.terminalGlobal(
          shellCommand(`pm2 delete ${processName}`),
          "Smazte proces a zkuste znovu"
        ),
        S.terminalGlobal(
          shellCommand("pm2 kill"),
          "Restartujte PM2 daemon"
        ),
      ];
  }
}
```

### 4.4 Git Output Parsing Functions

#### src/domain/functions/git.ts

```typescript
/**
 * Git output parsing functions.
 * Pure functions for parsing git command output.
 */

/**
 * Information extracted from git status --porcelain.
 */
export type GitStatusInfo = {
  readonly isClean: boolean;
  readonly modifiedFiles: readonly string[];
  readonly addedFiles: readonly string[];
  readonly deletedFiles: readonly string[];
  readonly untrackedFiles: readonly string[];
  readonly conflictedFiles: readonly string[];
};

/**
 * Parse git status --porcelain output.
 */
export function parseGitStatusPorcelain(output: string): GitStatusInfo {
  const modified: string[] = [];
  const added: string[] = [];
  const deleted: string[] = [];
  const untracked: string[] = [];
  const conflicted: string[] = [];

  const lines = output.split("\n").filter((line) => line.trim() !== "");

  for (const line of lines) {
    if (line.length < 3) continue;

    const indexStatus = line[0];
    const workTreeStatus = line[1];
    const filePath = line.substring(3).trim();

    // Check for conflicts (both modified)
    if (indexStatus === "U" || workTreeStatus === "U") {
      conflicted.push(filePath);
      continue;
    }

    // Untracked
    if (indexStatus === "?" && workTreeStatus === "?") {
      untracked.push(filePath);
      continue;
    }

    // Added
    if (indexStatus === "A") {
      added.push(filePath);
      continue;
    }

    // Deleted
    if (indexStatus === "D" || workTreeStatus === "D") {
      deleted.push(filePath);
      continue;
    }

    // Modified (M in index or worktree)
    if (indexStatus === "M" || workTreeStatus === "M") {
      modified.push(filePath);
      continue;
    }

    // Renamed (includes old and new path)
    if (indexStatus === "R") {
      modified.push(filePath.split(" -> ").pop() ?? filePath);
      continue;
    }
  }

  return {
    isClean:
      modified.length === 0 &&
      added.length === 0 &&
      deleted.length === 0 &&
      untracked.length === 0 &&
      conflicted.length === 0,
    modifiedFiles: modified,
    addedFiles: added,
    deletedFiles: deleted,
    untrackedFiles: untracked,
    conflictedFiles: conflicted,
  };
}

/**
 * Information extracted from git pull output.
 */
export type GitPullInfo = {
  readonly commitCount: number;
  readonly filesChanged: number;
  readonly insertions: number;
  readonly deletions: number;
};

/**
 * Parse git pull output for statistics.
 */
export function parseGitPullStats(output: string): GitPullInfo {
  let commitCount = 0;
  let filesChanged = 0;
  let insertions = 0;
  let deletions = 0;

  // Match commit count
  const commitMatch = output.match(/(\d+)\s+commits?/i);
  if (commitMatch?.[1]) {
    commitCount = parseInt(commitMatch[1], 10);
  }

  // Match files changed
  const filesMatch = output.match(/(\d+)\s+files?\s+changed/i);
  if (filesMatch?.[1]) {
    filesChanged = parseInt(filesMatch[1], 10);
  }

  // Match insertions
  const insertMatch = output.match(/(\d+)\s+insertions?\(\+\)/i);
  if (insertMatch?.[1]) {
    insertions = parseInt(insertMatch[1], 10);
  }

  // Match deletions
  const deleteMatch = output.match(/(\d+)\s+deletions?\(-\)/i);
  if (deleteMatch?.[1]) {
    deletions = parseInt(deleteMatch[1], 10);
  }

  return {
    commitCount: commitCount || 1, // Default to 1 if we updated
    filesChanged,
    insertions,
    deletions,
  };
}

/**
 * Check if git output indicates a specific error.
 */
export function detectGitError(
  output: string
): "conflict" | "network" | "auth" | "not_repo" | null {
  const lower = output.toLowerCase();

  if (lower.includes("conflict") || lower.includes("merge conflict")) {
    return "conflict";
  }

  if (
    lower.includes("could not resolve host") ||
    lower.includes("network") ||
    lower.includes("connection refused") ||
    lower.includes("unable to access")
  ) {
    return "network";
  }

  if (
    lower.includes("authentication failed") ||
    lower.includes("permission denied") ||
    lower.includes("401") ||
    lower.includes("403")
  ) {
    return "auth";
  }

  if (lower.includes("not a git repository")) {
    return "not_repo";
  }

  return null;
}
```

### 4.5 Index Exports

#### src/domain/functions/index.ts

```typescript
/**
 * Domain functions - re-export all function modules.
 */

export * from "./strategy";
export * from "./retry";
export * from "./suggestion";
export * from "./git";
```

## Verification Checklist

- [x] All functions are pure (no side effects)
- [x] All sum types are exhaustively handled
- [x] All functions have appropriate return types
- [x] No external dependencies (only domain types)
- [x] Functions are well-documented

## Test File

#### src/domain/functions/strategy.test.ts

```typescript
import { describe, expect, it } from "bun:test";
import {
  determinePullStrategy,
  decideBuild,
  determineBuildFailureStrategy,
} from "./strategy";
import { GitPullResult, BuildResult, durationMs } from "@domain/types";

describe("determinePullStrategy", () => {
  it("returns proceed_with_build for updated", () => {
    const result = determinePullStrategy(GitPullResult.updated(5));
    expect(result.kind).toBe("proceed_with_build");
  });

  it("returns skip_build for already_up_to_date", () => {
    const result = determinePullStrategy(GitPullResult.alreadyUpToDate());
    expect(result.kind).toBe("skip_build");
  });

  it("returns stash_and_retry for conflict", () => {
    const result = determinePullStrategy(GitPullResult.conflict(["file.ts"]));
    expect(result.kind).toBe("stash_and_retry");
  });

  it("returns skip_build for network_error", () => {
    const result = determinePullStrategy(GitPullResult.networkError("timeout"));
    expect(result.kind).toBe("skip_build");
  });

  it("returns abort for not_a_repository", () => {
    const result = determinePullStrategy(GitPullResult.notARepository());
    expect(result.kind).toBe("abort");
  });
});

describe("decideBuild", () => {
  const config = {
    repositoryPath: "/test",
    distPath: "/test/dist",
    distBackupPath: "/test/dist-backup",
    logsPath: "/test/logs",
    gitTimeoutMs: 30000,
    buildTimeoutMs: 300000,
    processStartTimeoutMs: 10000,
    maxRetries: 5,
    retryDelayMs: 5000,
    mainProcessName: "babybox",
    configerProcessName: "configer",
    enableAutoUpdate: true,
    enableRollback: true,
  };

  it("builds when updated", () => {
    const result = decideBuild(GitPullResult.updated(1), true, config);
    expect(result.kind).toBe("build");
  });

  it("builds when dist does not exist", () => {
    const result = decideBuild(GitPullResult.alreadyUpToDate(), false, config);
    expect(result.kind).toBe("build");
  });

  it("skips build when up to date and dist exists", () => {
    const result = decideBuild(GitPullResult.alreadyUpToDate(), true, config);
    expect(result.kind).toBe("skip");
  });
});

describe("determineBuildFailureStrategy", () => {
  const configWithRollback = {
    repositoryPath: "/test",
    distPath: "/test/dist",
    distBackupPath: "/test/dist-backup",
    logsPath: "/test/logs",
    gitTimeoutMs: 30000,
    buildTimeoutMs: 300000,
    processStartTimeoutMs: 10000,
    maxRetries: 5,
    retryDelayMs: 5000,
    mainProcessName: "babybox",
    configerProcessName: "configer",
    enableAutoUpdate: true,
    enableRollback: true,
  };

  it("returns rollback when backup exists", () => {
    const result = determineBuildFailureStrategy(
      BuildResult.compilationFailed("error", []),
      true,
      configWithRollback
    );
    expect(result.kind).toBe("rollback");
  });

  it("returns use_existing when no backup", () => {
    const result = determineBuildFailureStrategy(
      BuildResult.compilationFailed("error", []),
      false,
      configWithRollback
    );
    expect(result.kind).toBe("use_existing");
  });
});
```

Run tests:
```bash
bun test src/domain/functions/strategy.test.ts
```
