/**
 * Git adapter for macOS.
 * macOS is Unix-like, so we can reuse the Ubuntu implementation.
 */

import { createUbuntuGitAdapter } from "../ubuntu/git.adapter";
import type { DirectoryPath } from "../../../domain/types/branded";
import type { GitPort } from "../../../application/ports/git.port";

export function createMacGitAdapter(repoPath: DirectoryPath): GitPort {
  // macOS git behaves the same as Ubuntu
  return createUbuntuGitAdapter(repoPath);
}
