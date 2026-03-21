# Project 3: Infrastructure Layer

> **Prerequisites**: Read [STARTUP-REWRITE.md](../STARTUP-REWRITE.md) first for context and status tracking.

## Overview

| Aspect | Details |
|--------|---------|
| **Goal** | Implement adapters and wrappers for external systems |
| **Risk** | Medium |
| **Effort** | 2 days |
| **Dependencies** | #1 Domain Types, #2 Logging System |
| **Unlocks** | Application layer orchestration |

## Design Principles

1. **Never throw** - All wrappers return Result types
2. **OS abstraction** - Adapters implement port interfaces per OS
3. **Timeout handling** - All external calls have timeouts
4. **Detailed errors** - Capture stdout, stderr, exit codes

## Tasks

### 3.1 Shell Wrapper (Never Throws)

#### src/infrastructure/wrappers/shell.ts

```typescript
/**
 * Shell command execution wrapper.
 * Wraps Bun.spawn and NEVER throws.
 */

import { Result, ok, err } from "neverthrow";
import type {
  ShellCommand,
  ShellOptions,
  ShellResult,
  DurationMs,
  DirectoryPath,
} from "@domain/types";
import { ShellResult as SR, durationMs } from "@domain/types";

/**
 * Execute a shell command safely.
 * Returns Result - never throws.
 */
export async function executeCommand(
  command: ShellCommand,
  options: ShellOptions = {}
): Promise<Result<ShellResult, never>> {
  const startTime = Date.now();
  const timeoutMs = options.timeoutMs ?? (30000 as DurationMs);

  try {
    // Parse command into parts
    const parts = parseCommand(command);
    if (parts.length === 0) {
      return ok(SR.spawnError("Prazdny prikaz"));
    }

    const [cmd, ...args] = parts;
    
    // Ensure cmd is defined (TypeScript narrowing)
    if (cmd === undefined) {
      return ok(SR.spawnError("Prazdny prikaz"));
    }

    // Create subprocess
    const proc = Bun.spawn([cmd, ...args], {
      cwd: options.cwd,
      env: options.env ? { ...process.env, ...options.env } : undefined,
      stdout: "pipe",
      stderr: "pipe",
    });

    // Set up timeout
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      proc.kill();
    }, timeoutMs);

    // Collect output
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    // Read stdout
    if (proc.stdout) {
      const reader = proc.stdout.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          stdoutChunks.push(decoder.decode(value));
        }
      } catch {
        // Ignore read errors
      }
    }

    // Read stderr
    if (proc.stderr) {
      const reader = proc.stderr.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          stderrChunks.push(decoder.decode(value));
        }
      } catch {
        // Ignore read errors
      }
    }

    // Wait for process to exit
    const exitCode = await proc.exited;
    clearTimeout(timeoutId);

    const duration = durationMs(Date.now() - startTime);
    const stdout = stdoutChunks.join("");
    const stderr = stderrChunks.join("");

    if (timedOut) {
      return ok(SR.timeout(stdout, stderr, timeoutMs));
    }

    if (exitCode === 0) {
      return ok(SR.success(stdout, stderr, duration));
    }

    return ok(SR.nonZeroExit(stdout, stderr, exitCode, duration));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return ok(SR.spawnError(message));
  }
}

/**
 * Parse a shell command string into parts.
 * Handles basic quoting.
 */
function parseCommand(command: ShellCommand): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuote: "'" | '"' | null = null;

  for (const char of command) {
    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = char;
    } else if (char === " ") {
      if (current) {
        parts.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

/**
 * Execute a command in a specific directory.
 */
export async function executeInDirectory(
  command: ShellCommand,
  directory: DirectoryPath,
  timeoutMs?: DurationMs
): Promise<Result<ShellResult, never>> {
  return executeCommand(command, { cwd: directory, timeoutMs });
}
```

### 3.2 File System Wrapper

#### src/infrastructure/wrappers/fs.ts

```typescript
/**
 * File system wrapper.
 * All operations return Result types - never throws.
 */

import { Result, ok, err } from "neverthrow";
import {
  existsSync,
  mkdirSync,
  rmSync,
  renameSync,
  copyFileSync,
  readdirSync,
  statSync,
} from "fs";
import { copyFile, mkdir, rm, rename, readdir, stat } from "fs/promises";
import type { AbsolutePath, DirectoryPath } from "@domain/types";

export type FsError = {
  readonly operation: string;
  readonly path: string;
  readonly message: string;
  readonly code?: string;
};

function createFsError(
  operation: string,
  path: string,
  error: unknown
): FsError {
  if (error instanceof Error) {
    // Extract Node.js error code if available
    const nodeError = error as Error & { code?: string };
    return {
      operation,
      path,
      message: error.message,
      code: nodeError.code,
    };
  }
  return {
    operation,
    path,
    message: String(error),
  };
}

/**
 * Check if a path exists.
 */
export function pathExists(path: string): boolean {
  try {
    return existsSync(path);
  } catch {
    return false;
  }
}

/**
 * Check if path is a directory.
 */
export function isDirectory(path: string): Result<boolean, FsError> {
  try {
    const stats = statSync(path);
    return ok(stats.isDirectory());
  } catch (e) {
    return err(createFsError("isDirectory", path, e));
  }
}

/**
 * Create directory recursively.
 */
export function createDirectory(path: string): Result<void, FsError> {
  try {
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
    }
    return ok(undefined);
  } catch (e) {
    return err(createFsError("createDirectory", path, e));
  }
}

/**
 * Create directory recursively (async).
 */
export async function createDirectoryAsync(
  path: string
): Promise<Result<void, FsError>> {
  try {
    if (!existsSync(path)) {
      await mkdir(path, { recursive: true });
    }
    return ok(undefined);
  } catch (e) {
    return err(createFsError("createDirectory", path, e));
  }
}

/**
 * Remove file or directory.
 */
export function removePath(
  path: string,
  options?: { recursive?: boolean }
): Result<void, FsError> {
  try {
    if (existsSync(path)) {
      rmSync(path, { recursive: options?.recursive ?? false, force: true });
    }
    return ok(undefined);
  } catch (e) {
    return err(createFsError("removePath", path, e));
  }
}

/**
 * Remove file or directory (async).
 */
export async function removePathAsync(
  path: string,
  options?: { recursive?: boolean }
): Promise<Result<void, FsError>> {
  try {
    if (existsSync(path)) {
      await rm(path, { recursive: options?.recursive ?? false, force: true });
    }
    return ok(undefined);
  } catch (e) {
    return err(createFsError("removePath", path, e));
  }
}

/**
 * Rename/move a file or directory.
 */
export function renamePath(
  oldPath: string,
  newPath: string
): Result<void, FsError> {
  try {
    renameSync(oldPath, newPath);
    return ok(undefined);
  } catch (e) {
    return err(createFsError("renamePath", `${oldPath} -> ${newPath}`, e));
  }
}

/**
 * Rename/move a file or directory (async).
 */
export async function renamePathAsync(
  oldPath: string,
  newPath: string
): Promise<Result<void, FsError>> {
  try {
    await rename(oldPath, newPath);
    return ok(undefined);
  } catch (e) {
    return err(createFsError("renamePath", `${oldPath} -> ${newPath}`, e));
  }
}

/**
 * Copy a single file.
 */
export function copyFilePath(
  src: string,
  dest: string
): Result<void, FsError> {
  try {
    copyFileSync(src, dest);
    return ok(undefined);
  } catch (e) {
    return err(createFsError("copyFile", `${src} -> ${dest}`, e));
  }
}

/**
 * Copy a directory recursively.
 * Uses shell cp command for simplicity and reliability.
 */
export async function copyDirectoryAsync(
  src: string,
  dest: string
): Promise<Result<void, FsError>> {
  try {
    // Ensure destination parent exists
    const destParent = dest.substring(0, dest.lastIndexOf("/"));
    if (destParent && !existsSync(destParent)) {
      await mkdir(destParent, { recursive: true });
    }

    // Use shell cp -r for recursive copy
    const proc = Bun.spawn(["cp", "-r", src, dest], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text();
      return err({
        operation: "copyDirectory",
        path: `${src} -> ${dest}`,
        message: stderr || `Exit code: ${exitCode}`,
      });
    }

    return ok(undefined);
  } catch (e) {
    return err(createFsError("copyDirectory", `${src} -> ${dest}`, e));
  }
}

/**
 * List directory contents.
 */
export function listDirectory(path: string): Result<string[], FsError> {
  try {
    const entries = readdirSync(path);
    return ok(entries);
  } catch (e) {
    return err(createFsError("listDirectory", path, e));
  }
}

/**
 * List directory contents (async).
 */
export async function listDirectoryAsync(
  path: string
): Promise<Result<string[], FsError>> {
  try {
    const entries = await readdir(path);
    return ok(entries);
  } catch (e) {
    return err(createFsError("listDirectory", path, e));
  }
}
```

### 3.3 PM2 Wrapper

#### src/infrastructure/wrappers/pm2.ts

```typescript
/**
 * PM2 process manager wrapper.
 * All operations return Result types - never throws.
 */

import { Result, ok, err } from "neverthrow";
import { executeCommand } from "./shell";
import type {
  ProcessName,
  ProcessStartResult,
  ProcessStopResult,
  ShellCommand,
  DurationMs,
  DirectoryPath,
} from "@domain/types";
import { shellCommand, durationMs, processName } from "@domain/types";

export type PM2Error = {
  readonly operation: string;
  readonly processName: string;
  readonly message: string;
  readonly stderr?: string;
};

/**
 * Start a process with PM2.
 */
export async function pm2Start(
  name: ProcessName,
  script: string,
  cwd: DirectoryPath
): Promise<Result<ProcessStartResult, PM2Error>> {
  const cmd = shellCommand(`pm2 start ${script} --name ${name}`);
  const result = await executeCommand(cmd, { cwd });

  // executeCommand never fails (returns Result<ShellResult, never>)
  const shellResult = result._unsafeUnwrap();

  switch (shellResult.kind) {
    case "success":
      // Try to extract PID from output
      const pidMatch = shellResult.stdout.match(/pid[:\s]+(\d+)/i);
      const pid = pidMatch ? parseInt(pidMatch[1] ?? "0", 10) : 0;
      return ok({ kind: "started", pid });

    case "non_zero_exit":
      if (
        shellResult.stderr.includes("already") ||
        shellResult.stdout.includes("already")
      ) {
        return ok({ kind: "already_running", pid: 0 });
      }
      return err({
        operation: "pm2Start",
        processName: name,
        message: `PM2 start selhal s kodem ${shellResult.exitCode}`,
        stderr: shellResult.stderr,
      });

    case "timeout":
      return err({
        operation: "pm2Start",
        processName: name,
        message: "PM2 start vyprsel casovy limit",
      });

    case "spawn_error":
      return err({
        operation: "pm2Start",
        processName: name,
        message: shellResult.message,
      });
  }
}

/**
 * Start a Bun process with PM2.
 */
export async function pm2StartBun(
  name: ProcessName,
  scriptPath: string,
  cwd: DirectoryPath
): Promise<Result<ProcessStartResult, PM2Error>> {
  const cmd = shellCommand(`pm2 start bun --name ${name} -- ${scriptPath}`);
  const result = await executeCommand(cmd, { cwd });
  const shellResult = result._unsafeUnwrap();

  switch (shellResult.kind) {
    case "success":
      const pidMatch = shellResult.stdout.match(/pid[:\s]+(\d+)/i);
      const pid = pidMatch ? parseInt(pidMatch[1] ?? "0", 10) : 0;
      return ok({ kind: "started", pid });

    case "non_zero_exit":
      if (
        shellResult.stderr.includes("already") ||
        shellResult.stdout.includes("already")
      ) {
        return ok({ kind: "already_running", pid: 0 });
      }
      return err({
        operation: "pm2StartBun",
        processName: name,
        message: `PM2 start selhal s kodem ${shellResult.exitCode}`,
        stderr: shellResult.stderr,
      });

    case "timeout":
      return err({
        operation: "pm2StartBun",
        processName: name,
        message: "PM2 start vyprsel casovy limit",
      });

    case "spawn_error":
      return err({
        operation: "pm2StartBun",
        processName: name,
        message: shellResult.message,
      });
  }
}

/**
 * Stop a process with PM2.
 */
export async function pm2Stop(
  name: ProcessName
): Promise<Result<ProcessStopResult, PM2Error>> {
  const cmd = shellCommand(`pm2 stop ${name}`);
  const result = await executeCommand(cmd);
  const shellResult = result._unsafeUnwrap();

  switch (shellResult.kind) {
    case "success":
      return ok({ kind: "stopped" });

    case "non_zero_exit":
      if (
        shellResult.stderr.includes("not found") ||
        shellResult.stdout.includes("not found")
      ) {
        return ok({ kind: "not_running" });
      }
      return err({
        operation: "pm2Stop",
        processName: name,
        message: `PM2 stop selhal s kodem ${shellResult.exitCode}`,
        stderr: shellResult.stderr,
      });

    case "timeout":
      return err({
        operation: "pm2Stop",
        processName: name,
        message: "PM2 stop vyprsel casovy limit",
      });

    case "spawn_error":
      return err({
        operation: "pm2Stop",
        processName: name,
        message: shellResult.message,
      });
  }
}

/**
 * Delete a process from PM2.
 */
export async function pm2Delete(
  name: ProcessName
): Promise<Result<ProcessStopResult, PM2Error>> {
  const cmd = shellCommand(`pm2 delete ${name}`);
  const result = await executeCommand(cmd);
  const shellResult = result._unsafeUnwrap();

  switch (shellResult.kind) {
    case "success":
      return ok({ kind: "stopped" });

    case "non_zero_exit":
      if (
        shellResult.stderr.includes("not found") ||
        shellResult.stdout.includes("not found")
      ) {
        return ok({ kind: "not_running" });
      }
      return err({
        operation: "pm2Delete",
        processName: name,
        message: `PM2 delete selhal s kodem ${shellResult.exitCode}`,
        stderr: shellResult.stderr,
      });

    case "timeout":
      return err({
        operation: "pm2Delete",
        processName: name,
        message: "PM2 delete vyprsel casovy limit",
      });

    case "spawn_error":
      return err({
        operation: "pm2Delete",
        processName: name,
        message: shellResult.message,
      });
  }
}

/**
 * Check if PM2 is installed.
 */
export async function pm2IsInstalled(): Promise<boolean> {
  const result = await executeCommand(shellCommand("pm2 --version"));
  const shellResult = result._unsafeUnwrap();
  return shellResult.kind === "success";
}

/**
 * Restart a process with PM2.
 */
export async function pm2Restart(
  name: ProcessName
): Promise<Result<ProcessStartResult, PM2Error>> {
  const cmd = shellCommand(`pm2 restart ${name}`);
  const result = await executeCommand(cmd);
  const shellResult = result._unsafeUnwrap();

  switch (shellResult.kind) {
    case "success":
      return ok({ kind: "started", pid: 0 });

    case "non_zero_exit":
      return err({
        operation: "pm2Restart",
        processName: name,
        message: `PM2 restart selhal s kodem ${shellResult.exitCode}`,
        stderr: shellResult.stderr,
      });

    case "timeout":
      return err({
        operation: "pm2Restart",
        processName: name,
        message: "PM2 restart vyprsel casovy limit",
      });

    case "spawn_error":
      return err({
        operation: "pm2Restart",
        processName: name,
        message: shellResult.message,
      });
  }
}
```

### 3.4 Git Adapter - Ubuntu

#### src/infrastructure/adapters/ubuntu/git.adapter.ts

```typescript
/**
 * Git adapter for Ubuntu.
 * Implements GitPort for Ubuntu-specific git operations.
 */

import { Result, ok, err } from "neverthrow";
import type {
  GitPullResult,
  GitStashResult,
  GitStatusResult,
  DirectoryPath,
  DurationMs,
} from "@domain/types";
import { GitPullResult as GPR, shellCommand, durationMs } from "@domain/types";
import { executeInDirectory } from "../../wrappers/shell";
import type { GitPort } from "@application/ports/git.port";

function parseGitPullOutput(stdout: string, stderr: string): GitPullResult {
  const combined = stdout + stderr;
  const lowerCombined = combined.toLowerCase();

  // Already up to date
  if (
    lowerCombined.includes("already up to date") ||
    lowerCombined.includes("already up-to-date")
  ) {
    return GPR.alreadyUpToDate();
  }

  // Conflicts
  if (
    lowerCombined.includes("conflict") ||
    lowerCombined.includes("merge conflict")
  ) {
    const conflictFiles = extractConflictFiles(combined);
    return GPR.conflict(conflictFiles);
  }

  // Network errors
  if (
    lowerCombined.includes("could not resolve host") ||
    lowerCombined.includes("network") ||
    lowerCombined.includes("connection refused") ||
    lowerCombined.includes("unable to access")
  ) {
    return GPR.networkError(stderr || stdout);
  }

  // Not a repository
  if (lowerCombined.includes("not a git repository")) {
    return GPR.notARepository();
  }

  // Success - try to extract commit count
  const commitMatch = combined.match(/(\d+)\s+commit/i);
  const commitCount = commitMatch ? parseInt(commitMatch[1] ?? "1", 10) : 1;

  return GPR.updated(commitCount);
}

function extractConflictFiles(output: string): string[] {
  const files: string[] = [];
  const lines = output.split("\n");

  for (const line of lines) {
    // CONFLICT (content): Merge conflict in <file>
    const match = line.match(/CONFLICT.*:\s+.*in\s+(.+)/);
    if (match?.[1]) {
      files.push(match[1].trim());
    }
  }

  return files;
}

export function createUbuntuGitAdapter(repoPath: DirectoryPath): GitPort {
  const timeoutMs = durationMs(30000);

  return {
    pull: async (): Promise<Result<GitPullResult, string>> => {
      const result = await executeInDirectory(
        shellCommand("git pull"),
        repoPath,
        timeoutMs
      );

      const shellResult = result._unsafeUnwrap();

      switch (shellResult.kind) {
        case "success":
        case "non_zero_exit":
          return ok(parseGitPullOutput(shellResult.stdout, shellResult.stderr));

        case "timeout":
          return ok(GPR.networkError("Git pull vyprsel casovy limit"));

        case "spawn_error":
          return ok(GPR.unknownError(shellResult.message));
      }
    },

    stash: async (): Promise<Result<GitStashResult, string>> => {
      const result = await executeInDirectory(
        shellCommand("git stash push -m 'Auto-stash by startup'"),
        repoPath,
        timeoutMs
      );

      const shellResult = result._unsafeUnwrap();

      switch (shellResult.kind) {
        case "success":
          if (shellResult.stdout.includes("No local changes")) {
            return ok({ kind: "nothing_to_stash" });
          }
          // Extract stash name from output
          const match = shellResult.stdout.match(/stash@\{(\d+)\}/);
          const stashName = match ? `stash@{${match[1]}}` : "stash@{0}";
          return ok({ kind: "stashed", stashName });

        case "non_zero_exit":
          if (
            shellResult.stdout.includes("No local changes") ||
            shellResult.stderr.includes("No local changes")
          ) {
            return ok({ kind: "nothing_to_stash" });
          }
          return ok({
            kind: "error",
            message: shellResult.stderr || shellResult.stdout,
          });

        case "timeout":
          return ok({ kind: "error", message: "Git stash vyprsel casovy limit" });

        case "spawn_error":
          return ok({ kind: "error", message: shellResult.message });
      }
    },

    status: async (): Promise<Result<GitStatusResult, string>> => {
      const result = await executeInDirectory(
        shellCommand("git status --porcelain"),
        repoPath,
        timeoutMs
      );

      const shellResult = result._unsafeUnwrap();

      switch (shellResult.kind) {
        case "success":
          if (shellResult.stdout.trim() === "") {
            return ok({ kind: "clean" });
          }

          const modified: string[] = [];
          const untracked: string[] = [];

          for (const line of shellResult.stdout.split("\n")) {
            if (!line.trim()) continue;
            const status = line.substring(0, 2);
            const file = line.substring(3).trim();

            if (status === "??") {
              untracked.push(file);
            } else {
              modified.push(file);
            }
          }

          return ok({
            kind: "dirty",
            modifiedFiles: modified,
            untrackedFiles: untracked,
          });

        case "non_zero_exit":
          return ok({
            kind: "error",
            message: shellResult.stderr || `Exit code: ${shellResult.exitCode}`,
          });

        case "timeout":
          return ok({
            kind: "error",
            message: "Git status vyprsel casovy limit",
          });

        case "spawn_error":
          return ok({ kind: "error", message: shellResult.message });
      }
    },

    fetch: async (): Promise<Result<void, string>> => {
      const result = await executeInDirectory(
        shellCommand("git fetch"),
        repoPath,
        timeoutMs
      );

      const shellResult = result._unsafeUnwrap();

      if (shellResult.kind === "success") {
        return ok(undefined);
      }

      return err(
        shellResult.kind === "spawn_error"
          ? shellResult.message
          : "Git fetch selhal"
      );
    },

    resetHard: async (): Promise<Result<void, string>> => {
      const result = await executeInDirectory(
        shellCommand("git reset --hard HEAD"),
        repoPath,
        timeoutMs
      );

      const shellResult = result._unsafeUnwrap();

      if (shellResult.kind === "success") {
        return ok(undefined);
      }

      return err(
        shellResult.kind === "spawn_error"
          ? shellResult.message
          : "Git reset selhal"
      );
    },
  };
}
```

### 3.5 Git Port Interface

#### src/application/ports/git.port.ts

```typescript
/**
 * Git port - interface for git operations.
 */

import type { Result } from "neverthrow";
import type { GitPullResult, GitStashResult, GitStatusResult } from "@domain/types";

export type GitPort = {
  readonly pull: () => Promise<Result<GitPullResult, string>>;
  readonly stash: () => Promise<Result<GitStashResult, string>>;
  readonly status: () => Promise<Result<GitStatusResult, string>>;
  readonly fetch: () => Promise<Result<void, string>>;
  readonly resetHard: () => Promise<Result<void, string>>;
};
```

### 3.6 File System Port Interface

#### src/application/ports/fs.port.ts

```typescript
/**
 * File system port - interface for file operations.
 */

import type { Result } from "neverthrow";

export type FsError = {
  readonly operation: string;
  readonly path: string;
  readonly message: string;
};

export type FileSystemPort = {
  readonly exists: (path: string) => boolean;
  readonly isDirectory: (path: string) => Result<boolean, FsError>;
  readonly createDirectory: (path: string) => Promise<Result<void, FsError>>;
  readonly remove: (path: string, recursive?: boolean) => Promise<Result<void, FsError>>;
  readonly rename: (oldPath: string, newPath: string) => Promise<Result<void, FsError>>;
  readonly copyFile: (src: string, dest: string) => Result<void, FsError>;
  readonly copyDirectory: (src: string, dest: string) => Promise<Result<void, FsError>>;
  readonly listDirectory: (path: string) => Promise<Result<string[], FsError>>;
};
```

### 3.7 Process Port Interface

#### src/application/ports/process.port.ts

```typescript
/**
 * Process port - interface for process management.
 */

import type { Result } from "neverthrow";
import type { ProcessName, ProcessStartResult, ProcessStopResult, DirectoryPath } from "@domain/types";

export type ProcessError = {
  readonly operation: string;
  readonly processName: string;
  readonly message: string;
};

export type ProcessPort = {
  readonly start: (
    name: ProcessName,
    script: string,
    cwd: DirectoryPath
  ) => Promise<Result<ProcessStartResult, ProcessError>>;

  readonly startBun: (
    name: ProcessName,
    scriptPath: string,
    cwd: DirectoryPath
  ) => Promise<Result<ProcessStartResult, ProcessError>>;

  readonly stop: (name: ProcessName) => Promise<Result<ProcessStopResult, ProcessError>>;

  readonly delete: (name: ProcessName) => Promise<Result<ProcessStopResult, ProcessError>>;

  readonly restart: (name: ProcessName) => Promise<Result<ProcessStartResult, ProcessError>>;

  readonly isManagerInstalled: () => Promise<boolean>;
};
```

### 3.8 Package Manager Port Interface

#### src/application/ports/package-manager.port.ts

```typescript
/**
 * Package manager port - interface for dependency management.
 */

import type { Result } from "neverthrow";
import type { DirectoryPath, DependencyInstallResult, BuildResult } from "@domain/types";

export type PackageManagerPort = {
  readonly install: (cwd: DirectoryPath) => Promise<Result<DependencyInstallResult, string>>;
  readonly build: (cwd: DirectoryPath) => Promise<Result<BuildResult, string>>;
  readonly isInstalled: () => Promise<boolean>;
};
```

### 3.9 Index Exports

#### src/infrastructure/wrappers/index.ts

```typescript
export * from "./shell";
export * from "./fs";
export * from "./pm2";
```

#### src/application/ports/index.ts

```typescript
export * from "./logger.port";
export * from "./git.port";
export * from "./fs.port";
export * from "./process.port";
export * from "./package-manager.port";
```

## Verification Checklist

- [x] Shell wrapper executes commands and captures output
- [x] Shell wrapper handles timeouts correctly
- [x] FS wrapper operations return Result types
- [x] PM2 wrapper starts/stops processes
- [x] Git adapter parses pull output correctly
- [x] All adapters implement their port interfaces
- [x] No functions throw exceptions

## Test File

#### src/infrastructure/wrappers/shell.test.ts

```typescript
import { describe, expect, it } from "bun:test";
import { executeCommand } from "./shell";
import { shellCommand, durationMs } from "@domain/types";

describe("shell wrapper", () => {
  it("executes simple commands", async () => {
    const result = await executeCommand(shellCommand("echo hello"));
    const shellResult = result._unsafeUnwrap();

    expect(shellResult.kind).toBe("success");
    if (shellResult.kind === "success") {
      expect(shellResult.stdout.trim()).toBe("hello");
    }
  });

  it("handles non-zero exit codes", async () => {
    const result = await executeCommand(shellCommand("exit 1"));
    const shellResult = result._unsafeUnwrap();

    expect(shellResult.kind).toBe("non_zero_exit");
  });

  it("handles timeouts", async () => {
    const result = await executeCommand(shellCommand("sleep 10"), {
      timeoutMs: durationMs(100),
    });
    const shellResult = result._unsafeUnwrap();

    expect(shellResult.kind).toBe("timeout");
  });

  it("handles invalid commands", async () => {
    const result = await executeCommand(
      shellCommand("this-command-does-not-exist-12345")
    );
    const shellResult = result._unsafeUnwrap();

    // Could be spawn_error or non_zero_exit depending on shell
    expect(["spawn_error", "non_zero_exit"]).toContain(shellResult.kind);
  });
});
```

Run tests:
```bash
bun test src/infrastructure/wrappers/shell.test.ts
```
