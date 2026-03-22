/**
 * Application context - dependency injection container.
 * Passed to all orchestration functions.
 */

import type { StartupConfig } from "../domain/types/config";
import type { OperatingSystem } from "../domain/types/os";
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
