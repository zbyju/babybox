# Project 6: CLI Presentation Layer

> **Prerequisites**: Read [STARTUP-REWRITE.md](../STARTUP-REWRITE.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Implement CLI entry point that wires up dependencies and runs the orchestrator |
| **Risk** | Low |
| **Effort** | 1 day |
| **Dependencies** | #5 Application Layer |
| **Unlocks** | Build & Distribution |

## Design Principles

1. **Thin layer** - Only argument parsing and dependency wiring
2. **OS detection** - Auto-detect or use CLI flag
3. **Graceful exit** - Return proper exit codes
4. **Czech output** - All user-visible messages in Czech

## Tasks

### 6.1 OS Detection

#### src/presentation/os-detection.ts

```typescript
/**
 * Operating system detection.
 */

import type { OperatingSystem, OsKind } from "@domain/types";
import { OS, isOsKind } from "@domain/types";

/**
 * Detect the current operating system.
 */
export function detectOS(): OperatingSystem {
  const platform = process.platform;

  switch (platform) {
    case "linux":
      return OS.ubuntu();
    case "win32":
      return OS.windows();
    case "darwin":
      return OS.mac();
    default:
      // Default to Ubuntu for unknown Linux-like systems
      return OS.ubuntu();
  }
}

/**
 * Parse OS from CLI argument.
 */
export function parseOSFromArg(arg: string | undefined): OperatingSystem | null {
  if (!arg) return null;

  const lower = arg.toLowerCase();
  if (lower === "ubuntu" || lower === "linux") {
    return OS.ubuntu();
  }
  if (lower === "windows" || lower === "win") {
    return OS.windows();
  }
  if (lower === "mac" || lower === "macos" || lower === "darwin") {
    return OS.mac();
  }

  return null;
}

/**
 * Get OS from CLI flags or detect automatically.
 */
export function resolveOS(flags: {
  ubuntu?: boolean;
  windows?: boolean;
  mac?: boolean;
}): OperatingSystem {
  if (flags.ubuntu) return OS.ubuntu();
  if (flags.windows) return OS.windows();
  if (flags.mac) return OS.mac();
  return detectOS();
}
```

### 6.2 Adapter Factory

#### src/presentation/adapter-factory.ts

```typescript
/**
 * Factory for creating OS-specific adapters.
 */

import type { OperatingSystem, StartupConfig, DirectoryPath } from "@domain/types";
import type { GitPort } from "@application/ports/git.port";
import type { FileSystemPort } from "@application/ports/fs.port";
import type { ProcessPort } from "@application/ports/process.port";
import type { PackageManagerPort } from "@application/ports/package-manager.port";

// Ubuntu adapters
import { createUbuntuGitAdapter } from "@infrastructure/adapters/ubuntu/git.adapter";
import { createUbuntuFsAdapter } from "@infrastructure/adapters/ubuntu/fs.adapter";
import { createUbuntuProcessAdapter } from "@infrastructure/adapters/ubuntu/process.adapter";
import { createUbuntuPackageManagerAdapter } from "@infrastructure/adapters/ubuntu/package-manager.adapter";

// Windows adapters (structure similar to Ubuntu)
import { createWindowsGitAdapter } from "@infrastructure/adapters/windows/git.adapter";
import { createWindowsFsAdapter } from "@infrastructure/adapters/windows/fs.adapter";
import { createWindowsProcessAdapter } from "@infrastructure/adapters/windows/process.adapter";
import { createWindowsPackageManagerAdapter } from "@infrastructure/adapters/windows/package-manager.adapter";

// Mac adapters (reuse Ubuntu for most, override where needed)
import { createMacGitAdapter } from "@infrastructure/adapters/mac/git.adapter";
import { createMacFsAdapter } from "@infrastructure/adapters/mac/fs.adapter";
import { createMacProcessAdapter } from "@infrastructure/adapters/mac/process.adapter";
import { createMacPackageManagerAdapter } from "@infrastructure/adapters/mac/package-manager.adapter";

export type Adapters = {
  readonly git: GitPort;
  readonly fs: FileSystemPort;
  readonly process: ProcessPort;
  readonly packageManager: PackageManagerPort;
};

/**
 * Create all adapters for the given OS.
 */
export function createAdapters(
  os: OperatingSystem,
  config: StartupConfig
): Adapters {
  const repoPath = config.repositoryPath as DirectoryPath;

  switch (os.kind) {
    case "ubuntu":
      return {
        git: createUbuntuGitAdapter(repoPath),
        fs: createUbuntuFsAdapter(),
        process: createUbuntuProcessAdapter(),
        packageManager: createUbuntuPackageManagerAdapter(),
      };

    case "windows":
      return {
        git: createWindowsGitAdapter(repoPath),
        fs: createWindowsFsAdapter(),
        process: createWindowsProcessAdapter(),
        packageManager: createWindowsPackageManagerAdapter(),
      };

    case "mac":
      return {
        git: createMacGitAdapter(repoPath),
        fs: createMacFsAdapter(),
        process: createMacProcessAdapter(),
        packageManager: createMacPackageManagerAdapter(),
      };
  }
}
```

### 6.3 Configuration Loading

#### src/presentation/config-loader.ts

```typescript
/**
 * Configuration loading from environment and defaults.
 */

import { resolve, dirname } from "path";
import type { StartupConfig, AbsolutePath, LogLevel } from "@domain/types";
import { StartupConfigSchema, EnvConfigSchema, absolutePath } from "@domain/types";

/**
 * Determine the repository root path.
 */
function findRepositoryRoot(): AbsolutePath {
  // When running from source: /repo/source/apps/startup-v2/src/presentation/cli.ts
  // When running compiled: /repo/source/apps/startup-v2/dist/startup
  
  // Go up from current file to find repo root
  let currentPath = dirname(Bun.main);
  
  // Look for .git directory or source directory
  for (let i = 0; i < 10; i++) {
    const gitPath = resolve(currentPath, ".git");
    const sourcePath = resolve(currentPath, "source");
    
    try {
      if (Bun.file(gitPath).size !== undefined || Bun.file(sourcePath).size !== undefined) {
        const result = absolutePath(currentPath);
        if (result) return result;
      }
    } catch {
      // Continue searching
    }
    
    const parent = dirname(currentPath);
    if (parent === currentPath) break;
    currentPath = parent;
  }
  
  // Fallback: assume we're in source/apps/startup-v2
  const fallback = resolve(dirname(Bun.main), "../../..");
  return absolutePath(fallback) ?? (fallback as AbsolutePath);
}

/**
 * Load configuration from environment and defaults.
 */
export function loadConfig(): StartupConfig {
  const envResult = EnvConfigSchema.safeParse(process.env);
  const env = envResult.success ? envResult.data : {};

  const repoPath = env.BABYBOX_REPO_PATH 
    ? absolutePath(env.BABYBOX_REPO_PATH) ?? findRepositoryRoot()
    : findRepositoryRoot();

  return StartupConfigSchema.parse({
    repositoryPath: repoPath,
    distPath: resolve(repoPath, "dist"),
    distBackupPath: resolve(repoPath, "dist-backup"),
    logsPath: resolve(repoPath, "source/apps/startup-v2/logs"),
    maxRetries: env.BABYBOX_MAX_RETRIES,
  });
}

/**
 * Determine log level from environment.
 */
export function getLogLevel(): LogLevel {
  const envResult = EnvConfigSchema.safeParse(process.env);
  if (envResult.success && envResult.data.BABYBOX_LOG_LEVEL) {
    return envResult.data.BABYBOX_LOG_LEVEL;
  }
  return "info";
}
```

### 6.4 Main CLI Entry Point

#### src/presentation/cli.ts

```typescript
/**
 * Babybox Startup Application - CLI Entry Point
 * 
 * Automatically updates and starts the babybox panel application.
 * Handles git pull, build, deployment, and service management.
 */

import { parseArgs } from "util";
import { createAppContext } from "@application/context";
import { startup, install } from "@application/orchestrator";
import { createCombinedLogger } from "@infrastructure/logging";
import { resolveOS } from "./os-detection";
import { createAdapters } from "./adapter-factory";
import { loadConfig, getLogLevel } from "./config-loader";
import { Messages } from "./messages";

const VERSION = "2.0.0";

const HELP_TEXT = `
Babybox Startup v${VERSION}

Automaticky aktualizuje a spousti babybox panel aplikaci.

Pouziti:
  startup [prepinace]

Prepinace:
  --ubuntu       Spustit v Ubuntu rezimu
  --windows      Spustit ve Windows rezimu
  --mac          Spustit v macOS rezimu
  --install      Provest prvotni instalaci
  --help, -h     Zobrazit tuto napovedu
  --version, -v  Zobrazit verzi

Priklady:
  startup                    # Auto-detekce OS, normalni startup
  startup --ubuntu           # Explicitne Ubuntu
  startup --install          # Prvotni instalace
  startup --ubuntu --install # Instalace na Ubuntu

Promenne prostredi:
  BABYBOX_REPO_PATH     Cesta k repozitari (vychozi: auto-detekce)
  BABYBOX_LOG_LEVEL     Uroven logovani: debug, info, warn, error
  BABYBOX_MAX_RETRIES   Maximalni pocet opakovani (vychozi: 5)
`;

async function main(): Promise<number> {
  // Parse arguments
  let args;
  try {
    args = parseArgs({
      args: Bun.argv.slice(2),
      options: {
        ubuntu: { type: "boolean", default: false },
        windows: { type: "boolean", default: false },
        mac: { type: "boolean", default: false },
        install: { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
        version: { type: "boolean", short: "v", default: false },
      },
      strict: true,
    });
  } catch (e) {
    console.error(`Chyba: Neplatny argument`);
    console.error(HELP_TEXT);
    return 1;
  }

  const { values } = args;

  // Handle --help
  if (values.help) {
    console.log(HELP_TEXT);
    return 0;
  }

  // Handle --version
  if (values.version) {
    console.log(`Babybox Startup v${VERSION}`);
    return 0;
  }

  // Load configuration
  const config = loadConfig();
  const logLevel = getLogLevel();

  // Create logger
  const logger = createCombinedLogger({
    logDir: config.logsPath,
    filePrefix: "startup",
    consoleLevel: logLevel,
    fileLevel: "debug",
  });

  // Resolve OS
  const os = resolveOS({
    ubuntu: values.ubuntu,
    windows: values.windows,
    mac: values.mac,
  });

  logger.info("startup", `Detekovan OS: ${os.kind}`);
  logger.debug("startup", `Konfigurace: ${JSON.stringify(config, null, 2)}`);

  // Create adapters
  const adapters = createAdapters(os, config);

  // Create context
  const ctx = createAppContext({
    config,
    os,
    logger,
    git: adapters.git,
    fs: adapters.fs,
    process: adapters.process,
    packageManager: adapters.packageManager,
  });

  // Run startup or install
  try {
    const result = values.install
      ? await install(ctx)
      : await startup(ctx);

    // Flush logs before exit
    await logger.flush();

    // Return appropriate exit code
    switch (result.kind) {
      case "success":
        return 0;
      case "partial_success":
        return 0; // Services started, some warnings
      case "failed":
        return 1;
    }
  } catch (e) {
    // This should never happen if we followed the "never throw" principle
    // But handle it just in case
    const message = e instanceof Error ? e.message : String(e);
    logger.error("startup", `Neocekavana chyba: ${message}`, []);
    await logger.flush();
    return 1;
  }
}

// Run and exit with appropriate code
main().then((code) => {
  process.exit(code);
});
```

### 6.5 Stub Adapters for Mac

Mac adapters can largely reuse Ubuntu implementation since macOS is Unix-like.

#### src/infrastructure/adapters/mac/git.adapter.ts

```typescript
/**
 * Git adapter for macOS.
 * macOS is Unix-like, so we can reuse most of the Ubuntu implementation.
 */

import { createUbuntuGitAdapter } from "../ubuntu/git.adapter";
import type { DirectoryPath } from "@domain/types";
import type { GitPort } from "@application/ports/git.port";

export function createMacGitAdapter(repoPath: DirectoryPath): GitPort {
  // macOS git behaves the same as Ubuntu
  return createUbuntuGitAdapter(repoPath);
}
```

#### src/infrastructure/adapters/mac/fs.adapter.ts

```typescript
/**
 * File system adapter for macOS.
 */

import { createUbuntuFsAdapter } from "../ubuntu/fs.adapter";
import type { FileSystemPort } from "@application/ports/fs.port";

export function createMacFsAdapter(): FileSystemPort {
  // macOS uses same POSIX filesystem operations
  return createUbuntuFsAdapter();
}
```

#### src/infrastructure/adapters/mac/process.adapter.ts

```typescript
/**
 * Process adapter for macOS.
 */

import { createUbuntuProcessAdapter } from "../ubuntu/process.adapter";
import type { ProcessPort } from "@application/ports/process.port";

export function createMacProcessAdapter(): ProcessPort {
  // PM2 works the same on macOS
  return createUbuntuProcessAdapter();
}
```

#### src/infrastructure/adapters/mac/package-manager.adapter.ts

```typescript
/**
 * Package manager adapter for macOS.
 */

import { createUbuntuPackageManagerAdapter } from "../ubuntu/package-manager.adapter";
import type { PackageManagerPort } from "@application/ports/package-manager.port";

export function createMacPackageManagerAdapter(): PackageManagerPort {
  // Bun works the same on macOS
  return createUbuntuPackageManagerAdapter();
}
```

### 6.6 Ubuntu Adapter Stubs (to be fully implemented)

#### src/infrastructure/adapters/ubuntu/fs.adapter.ts

```typescript
/**
 * File system adapter for Ubuntu.
 */

import { Result, ok, err } from "neverthrow";
import type { FileSystemPort, FsError } from "@application/ports/fs.port";
import * as fs from "@infrastructure/wrappers/fs";

export function createUbuntuFsAdapter(): FileSystemPort {
  return {
    exists: (path) => fs.pathExists(path),
    
    isDirectory: (path) => {
      const result = fs.isDirectory(path);
      if (result.isErr()) {
        return err({
          operation: "isDirectory",
          path,
          message: result.error.message,
        });
      }
      return ok(result.value);
    },
    
    createDirectory: async (path) => {
      const result = await fs.createDirectoryAsync(path);
      if (result.isErr()) {
        return err({
          operation: "createDirectory",
          path,
          message: result.error.message,
        });
      }
      return ok(undefined);
    },
    
    remove: async (path, recursive = false) => {
      const result = await fs.removePathAsync(path, { recursive });
      if (result.isErr()) {
        return err({
          operation: "remove",
          path,
          message: result.error.message,
        });
      }
      return ok(undefined);
    },
    
    rename: async (oldPath, newPath) => {
      const result = await fs.renamePathAsync(oldPath, newPath);
      if (result.isErr()) {
        return err({
          operation: "rename",
          path: `${oldPath} -> ${newPath}`,
          message: result.error.message,
        });
      }
      return ok(undefined);
    },
    
    copyFile: (src, dest) => {
      const result = fs.copyFilePath(src, dest);
      if (result.isErr()) {
        return err({
          operation: "copyFile",
          path: `${src} -> ${dest}`,
          message: result.error.message,
        });
      }
      return ok(undefined);
    },
    
    copyDirectory: async (src, dest) => {
      const result = await fs.copyDirectoryAsync(src, dest);
      if (result.isErr()) {
        return err({
          operation: "copyDirectory",
          path: `${src} -> ${dest}`,
          message: result.error.message,
        });
      }
      return ok(undefined);
    },
    
    listDirectory: async (path) => {
      const result = await fs.listDirectoryAsync(path);
      if (result.isErr()) {
        return err({
          operation: "listDirectory",
          path,
          message: result.error.message,
        });
      }
      return ok(result.value);
    },
  };
}
```

#### src/infrastructure/adapters/ubuntu/process.adapter.ts

```typescript
/**
 * Process adapter for Ubuntu (PM2).
 */

import { Result, ok, err } from "neverthrow";
import type { ProcessPort, ProcessError } from "@application/ports/process.port";
import type { ProcessName, DirectoryPath, ProcessStartResult, ProcessStopResult } from "@domain/types";
import * as pm2 from "@infrastructure/wrappers/pm2";

export function createUbuntuProcessAdapter(): ProcessPort {
  return {
    start: async (name, script, cwd) => {
      const result = await pm2.pm2Start(name, script, cwd);
      if (result.isErr()) {
        return err({
          operation: "start",
          processName: name,
          message: result.error.message,
        });
      }
      return ok(result.value);
    },

    startBun: async (name, scriptPath, cwd) => {
      const result = await pm2.pm2StartBun(name, scriptPath, cwd);
      if (result.isErr()) {
        return err({
          operation: "startBun",
          processName: name,
          message: result.error.message,
        });
      }
      return ok(result.value);
    },

    stop: async (name) => {
      const result = await pm2.pm2Stop(name);
      if (result.isErr()) {
        return err({
          operation: "stop",
          processName: name,
          message: result.error.message,
        });
      }
      return ok(result.value);
    },

    delete: async (name) => {
      const result = await pm2.pm2Delete(name);
      if (result.isErr()) {
        return err({
          operation: "delete",
          processName: name,
          message: result.error.message,
        });
      }
      return ok(result.value);
    },

    restart: async (name) => {
      const result = await pm2.pm2Restart(name);
      if (result.isErr()) {
        return err({
          operation: "restart",
          processName: name,
          message: result.error.message,
        });
      }
      return ok(result.value);
    },

    isManagerInstalled: () => pm2.pm2IsInstalled(),
  };
}
```

#### src/infrastructure/adapters/ubuntu/package-manager.adapter.ts

```typescript
/**
 * Package manager adapter for Ubuntu (Bun).
 */

import { Result, ok, err } from "neverthrow";
import type { PackageManagerPort } from "@application/ports/package-manager.port";
import type { DirectoryPath, DependencyInstallResult, BuildResult, DurationMs } from "@domain/types";
import { BuildResult as BR, durationMs, shellCommand } from "@domain/types";
import { executeInDirectory } from "@infrastructure/wrappers/shell";

export function createUbuntuPackageManagerAdapter(): PackageManagerPort {
  return {
    install: async (cwd) => {
      const result = await executeInDirectory(
        shellCommand("bun install"),
        cwd,
        durationMs(120000) // 2 minutes for install
      );

      const shellResult = result._unsafeUnwrap();

      switch (shellResult.kind) {
        case "success":
          return ok({ kind: "success" });

        case "non_zero_exit":
          return ok({
            kind: "install_failed",
            message: shellResult.stderr || `Exit code: ${shellResult.exitCode}`,
          });

        case "timeout":
          return ok({
            kind: "install_failed",
            message: "Instalace zavislosti vyprsela",
          });

        case "spawn_error":
          if (shellResult.message.includes("not found") || 
              shellResult.message.includes("command not found")) {
            return ok({ kind: "bun_not_found" });
          }
          return ok({
            kind: "install_failed",
            message: shellResult.message,
          });
      }
    },

    build: async (cwd) => {
      const startTime = Date.now();

      const result = await executeInDirectory(
        shellCommand("bun run build"),
        cwd,
        durationMs(300000) // 5 minutes for build
      );

      const duration = durationMs(Date.now() - startTime);
      const shellResult = result._unsafeUnwrap();

      switch (shellResult.kind) {
        case "success":
          return ok(BR.success(duration));

        case "non_zero_exit":
          // Parse errors from output
          const errors = shellResult.stderr
            .split("\n")
            .filter((line) => line.includes("error") || line.includes("Error"))
            .slice(0, 10); // Limit to 10 errors

          return ok(
            BR.compilationFailed(
              shellResult.stderr || `Build selhal s kodem ${shellResult.exitCode}`,
              errors
            )
          );

        case "timeout":
          return ok(BR.unknownError("Build vyprsel casovy limit"));

        case "spawn_error":
          return ok(BR.unknownError(shellResult.message));
      }
    },

    isInstalled: async () => {
      const result = await executeInDirectory(
        shellCommand("bun --version"),
        "." as DirectoryPath
      );
      const shellResult = result._unsafeUnwrap();
      return shellResult.kind === "success";
    },
  };
}
```

## Verification Checklist

- [ ] CLI parses all arguments correctly
- [ ] OS detection works on all platforms
- [ ] Help message displays in Czech
- [ ] Config loading finds repo root
- [ ] Adapters are created for each OS
- [ ] Exit codes are correct (0 success, 1 failure)
- [ ] Logs are flushed before exit

## Test File

#### src/presentation/cli.test.ts

```typescript
import { describe, expect, it } from "bun:test";
import { resolveOS, detectOS } from "./os-detection";
import { loadConfig } from "./config-loader";

describe("OS detection", () => {
  it("respects explicit ubuntu flag", () => {
    const os = resolveOS({ ubuntu: true });
    expect(os.kind).toBe("ubuntu");
  });

  it("respects explicit windows flag", () => {
    const os = resolveOS({ windows: true });
    expect(os.kind).toBe("windows");
  });

  it("respects explicit mac flag", () => {
    const os = resolveOS({ mac: true });
    expect(os.kind).toBe("mac");
  });

  it("auto-detects when no flag set", () => {
    const os = resolveOS({});
    // Should be one of the valid OS kinds
    expect(["ubuntu", "windows", "mac"]).toContain(os.kind);
  });
});

describe("config loading", () => {
  it("loads default config", () => {
    const config = loadConfig();
    expect(config.repositoryPath).toBeTruthy();
    expect(config.maxRetries).toBe(5);
  });
});
```

Run tests:
```bash
bun test src/presentation/cli.test.ts
```
