/**
 * File system wrapper.
 * All operations return Result types - never throws.
 */

import { type Result, ok, err } from "neverthrow";
import {
  existsSync,
  mkdirSync,
  rmSync,
  renameSync,
  copyFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { mkdir, rm, rename, readdir } from "node:fs/promises";

export type FsError = {
  readonly operation: string;
  readonly path: string;
  readonly message: string;
  readonly code?: string | undefined;
};

function createFsError(operation: string, path: string, error: unknown): FsError {
  if (error instanceof Error) {
    // Extract Node.js error code if available
    const nodeError = error as Error & { code?: string };
    const result: FsError = {
      operation,
      path,
      message: error.message,
    };
    if (nodeError.code !== undefined) {
      return { ...result, code: nodeError.code };
    }
    return result;
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
export async function createDirectoryAsync(path: string): Promise<Result<void, FsError>> {
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
export function removePath(path: string, options?: { recursive?: boolean }): Result<void, FsError> {
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
  options?: { recursive?: boolean },
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
export function renamePath(oldPath: string, newPath: string): Result<void, FsError> {
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
  newPath: string,
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
export function copyFilePath(src: string, dest: string): Result<void, FsError> {
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
  dest: string,
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
export async function listDirectoryAsync(path: string): Promise<Result<string[], FsError>> {
  try {
    const entries = await readdir(path);
    return ok(entries);
  } catch (e) {
    return err(createFsError("listDirectory", path, e));
  }
}
