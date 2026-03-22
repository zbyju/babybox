/**
 * Configuration loading from environment and defaults.
 */

import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import type { StartupConfig, AbsolutePath, LogLevel } from "../domain/types/index";
import { StartupConfigSchema, EnvConfigSchema, absolutePath } from "../domain/types/index";

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

    if (existsSync(gitPath) || existsSync(sourcePath)) {
      const result = absolutePath(currentPath);
      if (result) return result;
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

  const repoPath =
    env.BABYBOX_REPO_PATH !== undefined
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
  if (envResult.success && envResult.data.BABYBOX_LOG_LEVEL !== undefined) {
    return envResult.data.BABYBOX_LOG_LEVEL;
  }
  return "info";
}
