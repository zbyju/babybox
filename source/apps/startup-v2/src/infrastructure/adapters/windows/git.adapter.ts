/**
 * Git adapter for Windows.
 * TODO: Implement Windows-specific git handling.
 */

import { err } from "neverthrow";
import type { DirectoryPath } from "../../../domain/types/index.js";
import type { GitPort } from "../../../application/ports/git.port.js";

export function createWindowsGitAdapter(_repoPath: DirectoryPath): GitPort {
  const notImplemented = async () =>
    err("Windows git adapter neni implementovan");

  return {
    pull: () => notImplemented(),
    stash: () => notImplemented(),
    status: () => notImplemented(),
    resetHard: () => notImplemented(),
    fetch: () => notImplemented(),
  };
}
