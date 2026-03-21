/**
 * Application context - dependency injection container.
 * Passed to all orchestration functions.
 */

import type { StartupConfig, OperatingSystem } from "../domain/types/index.js";
import type { LoggerPort } from "./ports/logger.port.js";
import type { GitPort } from "./ports/git.port.js";
import type { FileSystemPort } from "./ports/fs.port.js";
import type { ProcessPort } from "./ports/process.port.js";
import type { PackageManagerPort } from "./ports/package-manager.port.js";

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
