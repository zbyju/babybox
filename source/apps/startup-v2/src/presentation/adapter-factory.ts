/**
 * Factory for creating OS-specific adapters.
 */

import type { DirectoryPath } from "../domain/types/branded";
import type { OperatingSystem } from "../domain/types/os";
import type { StartupConfig } from "../domain/types/config";
import type { GitPort } from "../application/ports/git.port";
import type { FileSystemPort } from "../application/ports/fs.port";
import type { ProcessPort } from "../application/ports/process.port";
import type { PackageManagerPort } from "../application/ports/package-manager.port";

// Ubuntu adapters
import { createUbuntuGitAdapter } from "../infrastructure/adapters/ubuntu/git.adapter";
import { createUbuntuFsAdapter } from "../infrastructure/adapters/ubuntu/fs.adapter";
import { createUbuntuProcessAdapter } from "../infrastructure/adapters/ubuntu/process.adapter";
import { createUbuntuPackageManagerAdapter } from "../infrastructure/adapters/ubuntu/package-manager.adapter";

// Windows adapters (stub implementations)
import { createWindowsGitAdapter } from "../infrastructure/adapters/windows/git.adapter";
import { createWindowsFsAdapter } from "../infrastructure/adapters/windows/fs.adapter";
import { createWindowsProcessAdapter } from "../infrastructure/adapters/windows/process.adapter";
import { createWindowsPackageManagerAdapter } from "../infrastructure/adapters/windows/package-manager.adapter";

// Mac adapters (reuse Ubuntu for most, Unix-like)
import { createMacGitAdapter } from "../infrastructure/adapters/mac/git.adapter";
import { createMacFsAdapter } from "../infrastructure/adapters/mac/fs.adapter";
import { createMacProcessAdapter } from "../infrastructure/adapters/mac/process.adapter";
import { createMacPackageManagerAdapter } from "../infrastructure/adapters/mac/package-manager.adapter";

export type Adapters = {
  readonly git: GitPort;
  readonly fs: FileSystemPort;
  readonly process: ProcessPort;
  readonly packageManager: PackageManagerPort;
};

/**
 * Create all adapters for the given OS.
 */
export function createAdapters(os: OperatingSystem, config: StartupConfig): Adapters {
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
