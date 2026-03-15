/**
 * Factory for creating OS-specific adapters.
 */

import type { OperatingSystem, StartupConfig, DirectoryPath } from "../domain/types/index.js";
import type { GitPort } from "../application/ports/git.port.js";
import type { FileSystemPort } from "../application/ports/fs.port.js";
import type { ProcessPort } from "../application/ports/process.port.js";
import type { PackageManagerPort } from "../application/ports/package-manager.port.js";

// Ubuntu adapters
import { createUbuntuGitAdapter } from "../infrastructure/adapters/ubuntu/git.adapter.js";
import { createUbuntuFsAdapter } from "../infrastructure/adapters/ubuntu/fs.adapter.js";
import { createUbuntuProcessAdapter } from "../infrastructure/adapters/ubuntu/process.adapter.js";
import { createUbuntuPackageManagerAdapter } from "../infrastructure/adapters/ubuntu/package-manager.adapter.js";

// Windows adapters (stub implementations)
import { createWindowsGitAdapter } from "../infrastructure/adapters/windows/git.adapter.js";
import { createWindowsFsAdapter } from "../infrastructure/adapters/windows/fs.adapter.js";
import { createWindowsProcessAdapter } from "../infrastructure/adapters/windows/process.adapter.js";
import { createWindowsPackageManagerAdapter } from "../infrastructure/adapters/windows/package-manager.adapter.js";

// Mac adapters (reuse Ubuntu for most, Unix-like)
import { createMacGitAdapter } from "../infrastructure/adapters/mac/git.adapter.js";
import { createMacFsAdapter } from "../infrastructure/adapters/mac/fs.adapter.js";
import { createMacProcessAdapter } from "../infrastructure/adapters/mac/process.adapter.js";
import { createMacPackageManagerAdapter } from "../infrastructure/adapters/mac/package-manager.adapter.js";

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
