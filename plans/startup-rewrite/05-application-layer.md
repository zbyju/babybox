# Project 5: Application Layer

> **Prerequisites**: Read [STARTUP-REWRITE.md](../STARTUP-REWRITE.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Implement orchestration logic connecting domain and infrastructure |
| **Risk** | Medium |
| **Effort** | 2 days |
| **Dependencies** | #3 Infrastructure Layer, #4 Domain Logic |
| **Unlocks** | CLI presentation layer |

## Design Principles

1. **Orchestration only** - Coordinates domain functions and infrastructure
2. **Dependency injection** - All dependencies via context object
3. **Sequential operations** - Clear step-by-step flow
4. **Comprehensive logging** - Log every significant action
5. **Graceful degradation** - Continue when possible, rollback when needed

## Tasks

### 5.1 Application Context

#### src/application/context.ts

```typescript
/**
 * Application context - dependency injection container.
 * Passed to all orchestration functions.
 */

import type { StartupConfig, OperatingSystem } from "@domain/types";
import type { LoggerPort } from "./ports/logger.port";
import type { GitPort } from "./ports/git.port";
import type { FileSystemPort } from "./ports/fs.port";
import type { ProcessPort } from "./ports/process.port";
import type { PackageManagerPort } from "./ports/package-manager.port";

/**
 * Application context containing all dependencies.
 * Passed as first parameter to orchestration functions.
 */
export type AppContext = {
  readonly config: StartupConfig;
  readonly os: OperatingSystem;
  readonly logger: LoggerPort;
  readonly git: GitPort;
  readonly fs: FileSystemPort;
  readonly process: ProcessPort;
  readonly packageManager: PackageManagerPort;
};

/**
 * Create a context with all dependencies.
 */
export function createAppContext(deps: {
  config: StartupConfig;
  os: OperatingSystem;
  logger: LoggerPort;
  git: GitPort;
  fs: FileSystemPort;
  process: ProcessPort;
  packageManager: PackageManagerPort;
}): AppContext {
  return {
    config: deps.config,
    os: deps.os,
    logger: deps.logger,
    git: deps.git,
    fs: deps.fs,
    process: deps.process,
    packageManager: deps.packageManager,
  };
}
```

### 5.2 Update Orchestrator

#### src/application/orchestrators/update.ts

```typescript
/**
 * Update orchestrator - handles git pull and conflict resolution.
 */

import { Result, ok, err } from "neverthrow";
import type { AppContext } from "../context";
import type { GitPullResult, GitStashResult } from "@domain/types";
import {
  determinePullStrategy,
  determineLocalChangesStrategy,
  shouldRetryGitPull,
} from "@domain/functions";
import { suggestionsForGitPull } from "@domain/functions";
import { Messages } from "@presentation/messages";

export type UpdateResult =
  | { readonly kind: "updated"; readonly commitCount: number }
  | { readonly kind: "already_up_to_date" }
  | { readonly kind: "updated_after_stash"; readonly stashName: string }
  | { readonly kind: "failed"; readonly reason: string };

/**
 * Perform update (git pull) with conflict handling.
 */
export async function performUpdate(ctx: AppContext): Promise<UpdateResult> {
  const { logger, git, config } = ctx;
  const repoPath = config.repositoryPath;

  logger.info("update", Messages.update.checking);

  // First, check git status
  const statusResult = await git.status();
  if (statusResult.isErr()) {
    logger.error("update", "Nelze zjistit stav repozitare", [], {
      error: { name: "GitError", message: statusResult.error },
    });
    return { kind: "failed", reason: statusResult.error };
  }

  const status = statusResult.value;
  let stashedChanges: string | null = null;

  // If dirty, stash changes first
  if (status.kind === "dirty") {
    logger.info("update", Messages.update.stashingChanges);

    const stashResult = await git.stash();
    if (stashResult.isErr()) {
      logger.warn("update", Messages.update.stashFailed, []);
      // Continue anyway - pull might still work
    } else if (stashResult.value.kind === "stashed") {
      stashedChanges = stashResult.value.stashName;
      logger.info("update", Messages.update.stashSuccess);
    }
  }

  // Perform git pull with retry
  logger.info("update", Messages.update.pulling);

  let pullResult: GitPullResult;
  let attempt = 0;

  while (true) {
    const result = await git.pull();
    if (result.isErr()) {
      logger.error(
        "update",
        "Git pull selhal",
        suggestionsForGitPull(
          { kind: "unknown_error", message: result.error },
          repoPath as DirectoryPath
        )
      );
      return { kind: "failed", reason: result.error };
    }

    pullResult = result.value;

    // Check if we should retry
    const retryDecision = shouldRetryGitPull(pullResult, attempt);
    if (retryDecision.kind === "retry") {
      attempt++;
      logger.info("update", `Opakovani pokusu za ${retryDecision.delayMs}ms...`);
      await sleep(retryDecision.delayMs);
      continue;
    }

    break;
  }

  // Analyze pull result
  const strategy = determinePullStrategy(pullResult);

  switch (strategy.kind) {
    case "proceed_with_build":
      if (pullResult.kind === "updated") {
        logger.info("update", Messages.update.updated(pullResult.commitsBehind));
        if (stashedChanges) {
          return {
            kind: "updated_after_stash",
            stashName: stashedChanges,
          };
        }
        return { kind: "updated", commitCount: pullResult.commitsBehind };
      }
      return { kind: "updated", commitCount: 1 };

    case "skip_build":
      logger.info("update", Messages.update.upToDate);
      return { kind: "already_up_to_date" };

    case "stash_and_retry":
      // Already stashed above, this shouldn't happen
      logger.warn("update", Messages.update.conflictDetected, []);
      return { kind: "failed", reason: "Konflikt pri aktualizaci" };

    case "abort":
      logger.error(
        "update",
        strategy.reason,
        suggestionsForGitPull(pullResult, repoPath as DirectoryPath)
      );
      return { kind: "failed", reason: strategy.reason };

    case "reset_and_retry":
      // Reset and try again
      const resetResult = await git.resetHard();
      if (resetResult.isErr()) {
        return { kind: "failed", reason: "Git reset selhal" };
      }
      // Recursive call with fresh state
      return performUpdate(ctx);
  }
}

// Import for DirectoryPath type
import type { DirectoryPath } from "@domain/types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### 5.3 Build Orchestrator

#### src/application/orchestrators/build.ts

```typescript
/**
 * Build orchestrator - handles dependency installation and compilation.
 */

import type { AppContext } from "../context";
import type { BuildResult, DurationMs, DirectoryPath } from "@domain/types";
import { durationMs, BuildResult as BR } from "@domain/types";
import { suggestionsForBuild } from "@domain/functions";
import { Messages } from "@presentation/messages";

export type BuildOutcome =
  | { readonly kind: "success"; readonly duration: DurationMs }
  | { readonly kind: "skipped"; readonly reason: string }
  | { readonly kind: "failed"; readonly result: BuildResult };

/**
 * Perform full build (install + compile).
 */
export async function performBuild(ctx: AppContext): Promise<BuildOutcome> {
  const { logger, packageManager, config } = ctx;
  const repoPath = config.repositoryPath as DirectoryPath;

  logger.info("build", Messages.build.starting);
  const startTime = Date.now();

  // Install dependencies
  logger.info("build", Messages.build.installingDeps);
  const installResult = await packageManager.install(repoPath);

  if (installResult.isErr()) {
    const buildResult = BR.dependencyInstallFailed(installResult.error);
    logger.error(
      "build",
      Messages.build.depsFailed,
      suggestionsForBuild(buildResult, repoPath)
    );
    return { kind: "failed", result: buildResult };
  }

  const depResult = installResult.value;
  if (depResult.kind !== "success") {
    const buildResult = BR.dependencyInstallFailed(
      depResult.kind === "bun_not_found"
        ? "Bun neni nainstalovany"
        : depResult.message
    );
    logger.error(
      "build",
      Messages.build.depsFailed,
      suggestionsForBuild(buildResult, repoPath)
    );
    return { kind: "failed", result: buildResult };
  }

  // Compile
  logger.info("build", Messages.build.compiling);
  const buildResult = await packageManager.build(repoPath);

  if (buildResult.isErr()) {
    const result = BR.unknownError(buildResult.error);
    logger.error(
      "build",
      Messages.build.failed,
      suggestionsForBuild(result, repoPath)
    );
    return { kind: "failed", result };
  }

  const result = buildResult.value;
  const duration = durationMs(Date.now() - startTime);

  switch (result.kind) {
    case "success":
      logger.info("build", Messages.build.success(duration), { duration });
      return { kind: "success", duration };

    default:
      logger.error(
        "build",
        Messages.build.failed,
        suggestionsForBuild(result, repoPath),
        { duration }
      );
      return { kind: "failed", result };
  }
}
```

### 5.4 Override Orchestrator

#### src/application/orchestrators/override.ts

```typescript
/**
 * Override orchestrator - handles deployment and rollback.
 */

import type { AppContext } from "../context";
import type { OverrideResult } from "@domain/types";
import { OverrideResult as OR } from "@domain/types";
import { suggestionsForOverride } from "@domain/functions";
import { Messages } from "@presentation/messages";

export type OverrideOutcome =
  | { readonly kind: "success" }
  | { readonly kind: "rollback_success"; readonly originalError: string }
  | { readonly kind: "failed"; readonly reason: string };

/**
 * Override dist with new build, with rollback capability.
 */
export async function performOverride(ctx: AppContext): Promise<OverrideOutcome> {
  const { logger, fs, config } = ctx;
  const { distPath, distBackupPath } = config;

  logger.info("override", Messages.override.starting);

  // Step 1: Backup current dist if exists
  const distExists = fs.exists(distPath);
  if (distExists) {
    logger.info("override", Messages.override.backingUp);

    // Remove old backup if exists
    const oldBackupExists = fs.exists(distBackupPath);
    if (oldBackupExists) {
      const removeResult = await fs.remove(distBackupPath, true);
      if (removeResult.isErr()) {
        const suggestions = suggestionsForOverride(
          OR.backupFailed(removeResult.error.message),
          distPath,
          distBackupPath
        );
        logger.error("override", "Nelze smazat starou zalohu", suggestions);
        return { kind: "failed", reason: removeResult.error.message };
      }
    }

    // Rename dist -> dist-backup
    const renameResult = await fs.rename(distPath, distBackupPath);
    if (renameResult.isErr()) {
      const suggestions = suggestionsForOverride(
        OR.backupFailed(renameResult.error.message),
        distPath,
        distBackupPath
      );
      logger.error("override", "Nelze vytvorit zalohu", suggestions);
      return { kind: "failed", reason: renameResult.error.message };
    }
  }

  // Step 2: Copy new build to dist
  logger.info("override", Messages.override.copying);

  const sourcePath = `${config.repositoryPath}/source/apps/backend/dist`;
  const panelPath = `${config.repositoryPath}/source/apps/panel/dist`;

  // Copy backend dist
  const copyBackendResult = await fs.copyDirectory(sourcePath, distPath);
  if (copyBackendResult.isErr()) {
    // Rollback
    return await rollback(ctx, copyBackendResult.error.message);
  }

  // Copy panel dist to dist/public
  const copyPanelResult = await fs.copyDirectory(panelPath, `${distPath}/public`);
  if (copyPanelResult.isErr()) {
    return await rollback(ctx, copyPanelResult.error.message);
  }

  // Copy package.json
  const packageJsonResult = fs.copyFile(
    `${config.repositoryPath}/source/apps/backend/package.json`,
    `${distPath}/package.json`
  );
  if (packageJsonResult.isErr()) {
    return await rollback(ctx, packageJsonResult.error.message);
  }

  // Copy .env if exists
  const envPath = `${config.repositoryPath}/source/apps/backend/.env`;
  if (fs.exists(envPath)) {
    const envResult = fs.copyFile(envPath, `${distPath}/.env`);
    if (envResult.isErr()) {
      logger.warn("override", "Nelze zkopirovat .env", []);
      // Not critical, continue
    }
  }

  logger.info("override", Messages.override.success);
  return { kind: "success" };
}

/**
 * Perform rollback to backup.
 */
async function rollback(
  ctx: AppContext,
  originalError: string
): Promise<OverrideOutcome> {
  const { logger, fs, config } = ctx;
  const { distPath, distBackupPath } = config;

  logger.warn("override", Messages.override.rollingBack, []);

  // Remove partial dist
  const removeResult = await fs.remove(distPath, true);
  if (removeResult.isErr()) {
    const suggestions = suggestionsForOverride(
      OR.rollbackFailed(originalError, removeResult.error.message),
      distPath,
      distBackupPath
    );
    logger.error("override", Messages.override.rollbackFailed, suggestions);
    return {
      kind: "failed",
      reason: `Rollback selhal: ${removeResult.error.message}`,
    };
  }

  // Restore from backup
  const restoreResult = await fs.rename(distBackupPath, distPath);
  if (restoreResult.isErr()) {
    const suggestions = suggestionsForOverride(
      OR.rollbackFailed(originalError, restoreResult.error.message),
      distPath,
      distBackupPath
    );
    logger.error("override", Messages.override.rollbackFailed, suggestions);
    return {
      kind: "failed",
      reason: `Rollback selhal: ${restoreResult.error.message}`,
    };
  }

  logger.info("override", Messages.override.rollbackSuccess);
  return { kind: "rollback_success", originalError };
}
```

### 5.5 Process Orchestrator

#### src/application/orchestrators/process.ts

```typescript
/**
 * Process orchestrator - handles starting/stopping services.
 */

import type { AppContext } from "../context";
import type { ProcessName, DirectoryPath } from "@domain/types";
import { processName } from "@domain/types";
import { shouldRetryProcessStart } from "@domain/functions";
import { suggestionsForProcessStart } from "@domain/functions";
import { Messages } from "@presentation/messages";

export type ProcessOutcome =
  | { readonly kind: "all_started" }
  | { readonly kind: "partial"; readonly started: string[]; readonly failed: string[] }
  | { readonly kind: "all_failed"; readonly errors: string[] };

/**
 * Start all required services.
 */
export async function startAllServices(ctx: AppContext): Promise<ProcessOutcome> {
  const { logger, process: processPort, config } = ctx;

  const services = [
    {
      name: processName(config.configerProcessName),
      script: "src/index.ts",
      cwd: `${config.repositoryPath}/source/apps/configer` as DirectoryPath,
    },
    {
      name: processName(config.mainProcessName),
      script: "src/index.ts",
      cwd: `${config.repositoryPath}/source/apps/backend` as DirectoryPath,
    },
  ];

  const started: string[] = [];
  const failed: string[] = [];

  for (const service of services) {
    logger.info("process", Messages.process.starting(service.name));

    // Delete existing process first (ignore errors)
    await processPort.delete(service.name);

    // Start with retry
    let attempt = 0;
    let lastResult = await processPort.startBun(
      service.name,
      service.script,
      service.cwd
    );

    while (true) {
      if (lastResult.isErr()) {
        const retryDecision = shouldRetryProcessStart(
          { kind: "failed", message: lastResult.error.message },
          attempt
        );

        if (retryDecision.kind === "retry") {
          attempt++;
          logger.info(
            "process",
            Messages.process.retrying(service.name, attempt)
          );
          await sleep(retryDecision.delayMs);
          lastResult = await processPort.startBun(
            service.name,
            service.script,
            service.cwd
          );
          continue;
        }

        break;
      }

      const result = lastResult.value;
      const retryDecision = shouldRetryProcessStart(result, attempt);

      if (retryDecision.kind === "retry") {
        attempt++;
        logger.info("process", Messages.process.retrying(service.name, attempt));
        await sleep(retryDecision.delayMs);
        lastResult = await processPort.startBun(
          service.name,
          service.script,
          service.cwd
        );
        continue;
      }

      break;
    }

    // Check final result
    if (lastResult.isErr()) {
      logger.error(
        "process",
        Messages.process.failed(service.name),
        suggestionsForProcessStart(
          { kind: "failed", message: lastResult.error.message },
          service.name
        )
      );
      failed.push(service.name);
    } else {
      const result = lastResult.value;
      if (result.kind === "started" || result.kind === "already_running") {
        logger.info("process", Messages.process.started(service.name));
        started.push(service.name);
      } else {
        logger.error(
          "process",
          Messages.process.failed(service.name),
          suggestionsForProcessStart(result, service.name)
        );
        failed.push(service.name);
      }
    }
  }

  if (failed.length === 0) {
    return { kind: "all_started" };
  }

  if (started.length === 0) {
    return { kind: "all_failed", errors: failed };
  }

  return { kind: "partial", started, failed };
}

/**
 * Stop all services.
 */
export async function stopAllServices(ctx: AppContext): Promise<void> {
  const { logger, process: processPort, config } = ctx;

  const processes = [
    processName(config.mainProcessName),
    processName(config.configerProcessName),
  ];

  for (const name of processes) {
    logger.info("process", Messages.process.stopping(name));
    const result = await processPort.stop(name);

    if (result.isOk()) {
      logger.info("process", Messages.process.stopped(name));
    } else {
      logger.warn("process", `Nelze zastavit ${name}`, []);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### 5.6 Main Startup Orchestrator

#### src/application/orchestrator.ts

```typescript
/**
 * Main startup orchestrator.
 * Coordinates all phases of the startup process.
 */

import type { AppContext } from "./context";
import type { StartupResult } from "@domain/types";
import { decideBuild, determineBuildFailureStrategy } from "@domain/functions";
import { performUpdate, UpdateResult } from "./orchestrators/update";
import { performBuild, BuildOutcome } from "./orchestrators/build";
import { performOverride, OverrideOutcome } from "./orchestrators/override";
import { startAllServices, ProcessOutcome } from "./orchestrators/process";
import { Messages } from "@presentation/messages";

/**
 * Execute the full startup sequence.
 */
export async function startup(ctx: AppContext): Promise<StartupResult> {
  const { logger, fs, config } = ctx;

  logger.info("startup", Messages.startup.starting);

  // Phase 1: Update
  const updateResult = await performUpdate(ctx);
  const updated = updateResult.kind === "updated" || updateResult.kind === "updated_after_stash";

  if (updateResult.kind === "failed") {
    // Update failed, but we can still try to start existing version
    logger.warn("startup", "Aktualizace selhala, pokracuji s existujici verzi", []);
  }

  // Phase 2: Decide on build
  const distExists = fs.exists(config.distPath);
  const shouldBuild = decideBuild(
    updated
      ? { kind: "updated", commitsBehind: 1 }
      : { kind: "already_up_to_date" },
    distExists,
    config
  );

  let rebuilt = false;

  if (shouldBuild.kind === "build") {
    // Phase 3: Build
    const buildOutcome = await performBuild(ctx);

    if (buildOutcome.kind === "success") {
      rebuilt = true;

      // Phase 4: Override
      const overrideOutcome = await performOverride(ctx);

      if (overrideOutcome.kind === "failed") {
        // Override failed, try to rollback or use existing
        const backupExists = fs.exists(config.distBackupPath);
        const strategy = determineBuildFailureStrategy(
          { kind: "unknown_error", message: overrideOutcome.reason },
          backupExists,
          config
        );

        if (strategy.kind === "abort") {
          return {
            kind: "failed",
            phase: "override",
            message: overrideOutcome.reason,
          };
        }
        // Continue with existing/rolled back version
      }
    } else if (buildOutcome.kind === "failed") {
      // Build failed
      const backupExists = fs.exists(config.distBackupPath);
      const strategy = determineBuildFailureStrategy(
        buildOutcome.result,
        backupExists,
        config
      );

      if (strategy.kind === "abort") {
        return {
          kind: "failed",
          phase: "build",
          message:
            buildOutcome.result.kind === "compilation_failed"
              ? buildOutcome.result.message
              : "Build selhal",
        };
      }
      // Continue with existing version
      logger.warn("startup", "Build selhal, pouzivam existujici verzi", []);
    }
  }

  // Phase 5: Start services
  const processOutcome = await startAllServices(ctx);

  switch (processOutcome.kind) {
    case "all_started":
      logger.info("startup", Messages.startup.completed);
      return { kind: "success", updated, rebuilt };

    case "partial":
      logger.warn("startup", "Nektere sluzby se nespustily", []);
      return {
        kind: "partial_success",
        servicesStarted: true,
        warnings: processOutcome.failed.map((f) => `Sluzba ${f} selhala`),
      };

    case "all_failed":
      logger.error("startup", Messages.startup.failed, []);
      return {
        kind: "failed",
        phase: "service_start",
        message: "Zadna sluzba se nespustila",
      };
  }
}

/**
 * Execute installation (first-time setup).
 */
export async function install(ctx: AppContext): Promise<StartupResult> {
  const { logger, packageManager, config } = ctx;

  logger.info("install", Messages.install.starting);

  // Check if package manager is available
  const pmInstalled = await packageManager.isInstalled();
  if (!pmInstalled) {
    logger.error(
      "install",
      Messages.install.prerequisiteMissing("bun"),
      []
    );
    return {
      kind: "failed",
      phase: "dependency_install",
      message: "Bun neni nainstalovany",
    };
  }

  // Run full startup
  return startup(ctx);
}
```

### 5.7 Index Exports

#### src/application/orchestrators/index.ts

```typescript
export { performUpdate, type UpdateResult } from "./update";
export { performBuild, type BuildOutcome } from "./build";
export { performOverride, type OverrideOutcome } from "./override";
export { startAllServices, stopAllServices, type ProcessOutcome } from "./process";
```

#### src/application/index.ts

```typescript
export { createAppContext, type AppContext } from "./context";
export { startup, install } from "./orchestrator";
export * from "./orchestrators";
export * from "./ports";
```

## Verification Checklist

- [ ] Context properly injects all dependencies
- [ ] Update orchestrator handles all git scenarios
- [ ] Build orchestrator installs deps and compiles
- [ ] Override orchestrator backs up and rolls back
- [ ] Process orchestrator starts services with retry
- [ ] Main orchestrator coordinates all phases
- [ ] All operations are logged appropriately

## Test File

#### src/application/orchestrator.test.ts

```typescript
import { describe, expect, it, mock } from "bun:test";
import { startup } from "./orchestrator";
import { createAppContext } from "./context";
import type { AppContext } from "./context";
import { ok, err } from "neverthrow";

// Create mock implementations
function createMockContext(): AppContext {
  return createAppContext({
    config: {
      repositoryPath: "/test/repo",
      distPath: "/test/repo/dist",
      distBackupPath: "/test/repo/dist-backup",
      logsPath: "/test/repo/logs",
      gitTimeoutMs: 5000,
      buildTimeoutMs: 60000,
      processStartTimeoutMs: 5000,
      maxRetries: 3,
      retryDelayMs: 1000,
      mainProcessName: "babybox",
      configerProcessName: "configer",
      enableAutoUpdate: true,
      enableRollback: true,
    },
    os: { kind: "ubuntu" },
    logger: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      log: () => {},
      flush: async () => {},
      setLevel: () => {},
    },
    git: {
      pull: async () => ok({ kind: "already_up_to_date" }),
      stash: async () => ok({ kind: "nothing_to_stash" }),
      status: async () => ok({ kind: "clean" }),
      fetch: async () => ok(undefined),
      resetHard: async () => ok(undefined),
    },
    fs: {
      exists: () => true,
      isDirectory: () => ok(true),
      createDirectory: async () => ok(undefined),
      remove: async () => ok(undefined),
      rename: async () => ok(undefined),
      copyFile: () => ok(undefined),
      copyDirectory: async () => ok(undefined),
      listDirectory: async () => ok([]),
    },
    process: {
      start: async () => ok({ kind: "started", pid: 123 }),
      startBun: async () => ok({ kind: "started", pid: 123 }),
      stop: async () => ok({ kind: "stopped" }),
      delete: async () => ok({ kind: "stopped" }),
      restart: async () => ok({ kind: "started", pid: 123 }),
      isManagerInstalled: async () => true,
    },
    packageManager: {
      install: async () => ok({ kind: "success" }),
      build: async () => ok({ kind: "success", duration: 5000 as any }),
      isInstalled: async () => true,
    },
  });
}

describe("startup orchestrator", () => {
  it("succeeds when everything works", async () => {
    const ctx = createMockContext();
    const result = await startup(ctx);

    expect(result.kind).toBe("success");
  });

  it("handles already up to date", async () => {
    const ctx = createMockContext();
    const result = await startup(ctx);

    expect(result.kind).toBe("success");
    if (result.kind === "success") {
      expect(result.updated).toBe(false);
    }
  });
});
```

Run tests:
```bash
bun test src/application/orchestrator.test.ts
```
