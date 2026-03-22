/**
 * Package manager port - interface for dependency management.
 */

import type { Result } from "neverthrow";
import type { DirectoryPath, DependencyInstallResult, BuildResult } from "../../domain/types/index";

export type PackageManagerPort = {
  readonly install: (cwd: DirectoryPath) => Promise<Result<DependencyInstallResult, string>>;
  readonly build: (cwd: DirectoryPath) => Promise<Result<BuildResult, string>>;
  readonly isInstalled: () => Promise<boolean>;
};
