/**
 * Git output parsing functions.
 * Pure functions for parsing git command output.
 */

/**
 * Information extracted from git status --porcelain.
 */
export type GitStatusInfo = {
  readonly isClean: boolean;
  readonly modifiedFiles: readonly string[];
  readonly addedFiles: readonly string[];
  readonly deletedFiles: readonly string[];
  readonly untrackedFiles: readonly string[];
  readonly conflictedFiles: readonly string[];
};

/**
 * Parse git status --porcelain output.
 */
export function parseGitStatusPorcelain(output: string): GitStatusInfo {
  const modified: string[] = [];
  const added: string[] = [];
  const deleted: string[] = [];
  const untracked: string[] = [];
  const conflicted: string[] = [];

  const lines = output.split("\n").filter((line) => line.trim() !== "");

  for (const line of lines) {
    if (line.length < 3) continue;

    const indexStatus = line[0];
    const workTreeStatus = line[1];
    const filePath = line.substring(3).trim();

    // Check for conflicts (both modified)
    if (indexStatus === "U" || workTreeStatus === "U") {
      conflicted.push(filePath);
      continue;
    }

    // Untracked
    if (indexStatus === "?" && workTreeStatus === "?") {
      untracked.push(filePath);
      continue;
    }

    // Added
    if (indexStatus === "A") {
      added.push(filePath);
      continue;
    }

    // Deleted
    if (indexStatus === "D" || workTreeStatus === "D") {
      deleted.push(filePath);
      continue;
    }

    // Modified (M in index or worktree)
    if (indexStatus === "M" || workTreeStatus === "M") {
      modified.push(filePath);
      continue;
    }

    // Renamed (includes old and new path)
    if (indexStatus === "R") {
      modified.push(filePath.split(" -> ").pop() ?? filePath);
    }
  }

  return {
    isClean:
      modified.length === 0 &&
      added.length === 0 &&
      deleted.length === 0 &&
      untracked.length === 0 &&
      conflicted.length === 0,
    modifiedFiles: modified,
    addedFiles: added,
    deletedFiles: deleted,
    untrackedFiles: untracked,
    conflictedFiles: conflicted,
  };
}

/**
 * Information extracted from git pull output.
 */
export type GitPullInfo = {
  readonly commitCount: number;
  readonly filesChanged: number;
  readonly insertions: number;
  readonly deletions: number;
};

/**
 * Parse git pull output for statistics.
 */
export function parseGitPullStats(output: string): GitPullInfo {
  let commitCount = 0;
  let filesChanged = 0;
  let insertions = 0;
  let deletions = 0;

  // Match commit count
  const commitMatch = output.match(/(\d+)\s+commits?/i);
  if (commitMatch?.[1]) {
    commitCount = Number.parseInt(commitMatch[1], 10);
  }

  // Match files changed
  const filesMatch = output.match(/(\d+)\s+files?\s+changed/i);
  if (filesMatch?.[1]) {
    filesChanged = Number.parseInt(filesMatch[1], 10);
  }

  // Match insertions
  const insertMatch = output.match(/(\d+)\s+insertions?\(\+\)/i);
  if (insertMatch?.[1]) {
    insertions = Number.parseInt(insertMatch[1], 10);
  }

  // Match deletions
  const deleteMatch = output.match(/(\d+)\s+deletions?\(-\)/i);
  if (deleteMatch?.[1]) {
    deletions = Number.parseInt(deleteMatch[1], 10);
  }

  return {
    commitCount: commitCount || 1, // Default to 1 if we updated
    filesChanged,
    insertions,
    deletions,
  };
}

/**
 * Check if git output indicates a specific error.
 */
export function detectGitError(
  output: string,
): "conflict" | "network" | "auth" | "not_repo" | null {
  const lower = output.toLowerCase();

  if (lower.includes("conflict") || lower.includes("merge conflict")) {
    return "conflict";
  }

  if (
    lower.includes("could not resolve host") ||
    lower.includes("network") ||
    lower.includes("connection refused") ||
    lower.includes("unable to access")
  ) {
    return "network";
  }

  if (
    lower.includes("authentication failed") ||
    lower.includes("permission denied") ||
    lower.includes("401") ||
    lower.includes("403")
  ) {
    return "auth";
  }

  if (lower.includes("not a git repository")) {
    return "not_repo";
  }

  return null;
}
