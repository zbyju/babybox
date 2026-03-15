/**
 * Git adapter for macOS.
 * macOS is Unix-like, so we can reuse the Ubuntu implementation.
 */

import { createUbuntuGitAdapter } from "../ubuntu/git.adapter.js";
import type { DirectoryPath } from "../../../domain/types/index.js";
import type { GitPort } from "../../../application/ports/git.port.js";

export function createMacGitAdapter(repoPath: DirectoryPath): GitPort {
  // macOS git behaves the same as Ubuntu
  return createUbuntuGitAdapter(repoPath);
}
