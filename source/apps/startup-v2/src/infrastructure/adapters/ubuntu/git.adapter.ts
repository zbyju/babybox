/**
 * Git adapter for Ubuntu.
 * Implements GitPort for Ubuntu-specific git operations.
 */

import { type Result, ok, err } from "neverthrow";
import type {
  GitPullResult,
  GitStashResult,
  GitStatusResult,
  DirectoryPath,
} from "../../../domain/types/index";
import {
  GitPullResult as GPR,
  shellCommand,
  durationMs,
} from "../../../domain/types/index";
import { executeInDirectory } from "../../wrappers/shell";
import type { GitPort } from "../../../application/ports/git.port";

function parseGitPullOutput(stdout: string, stderr: string): GitPullResult {
  const combined = stdout + stderr;
  const lowerCombined = combined.toLowerCase();

  // Already up to date
  if (
    lowerCombined.includes("already up to date") ||
    lowerCombined.includes("already up-to-date")
  ) {
    return GPR.alreadyUpToDate();
  }

  // Conflicts
  if (
    lowerCombined.includes("conflict") ||
    lowerCombined.includes("merge conflict")
  ) {
    const conflictFiles = extractConflictFiles(combined);
    return GPR.conflict(conflictFiles);
  }

  // Network errors
  if (
    lowerCombined.includes("could not resolve host") ||
    lowerCombined.includes("network") ||
    lowerCombined.includes("connection refused") ||
    lowerCombined.includes("unable to access")
  ) {
    return GPR.networkError(stderr || stdout);
  }

  // Not a repository
  if (lowerCombined.includes("not a git repository")) {
    return GPR.notARepository();
  }

  // Success - try to extract commit count
  const commitMatch = combined.match(/(\d+)\s+commit/i);
  const commitCount = commitMatch
    ? Number.parseInt(commitMatch[1] ?? "1", 10)
    : 1;

  return GPR.updated(commitCount);
}

function extractConflictFiles(output: string): string[] {
  const files: string[] = [];
  const lines = output.split("\n");

  for (const line of lines) {
    // CONFLICT (content): Merge conflict in <file>
    const match = line.match(/CONFLICT.*:\s+.*in\s+(.+)/);
    if (match?.[1]) {
      files.push(match[1].trim());
    }
  }

  return files;
}

export function createUbuntuGitAdapter(repoPath: DirectoryPath): GitPort {
  const timeoutMs = durationMs(30000);

  return {
    pull: async (): Promise<Result<GitPullResult, string>> => {
      const result = await executeInDirectory(
        shellCommand("git pull"),
        repoPath as string,
        timeoutMs
      );

      const shellResult = result._unsafeUnwrap();

      switch (shellResult.kind) {
        case "success":
        case "non_zero_exit":
          return ok(parseGitPullOutput(shellResult.stdout, shellResult.stderr));

        case "timeout":
          return ok(GPR.networkError("Git pull vyprsel casovy limit"));

        case "spawn_error":
          return ok(GPR.unknownError(shellResult.message));
      }
    },

    stash: async (): Promise<Result<GitStashResult, string>> => {
      const result = await executeInDirectory(
        shellCommand("git stash push -m 'Auto-stash by startup'"),
        repoPath as string,
        timeoutMs
      );

      const shellResult = result._unsafeUnwrap();

      switch (shellResult.kind) {
        case "success":
          if (shellResult.stdout.includes("No local changes")) {
            return ok({ kind: "nothing_to_stash" });
          }
          // Extract stash name from output
          {
            const match = shellResult.stdout.match(/stash@\{(\d+)\}/);
            const stashName = match ? `stash@{${match[1]}}` : "stash@{0}";
            return ok({ kind: "stashed", stashName });
          }

        case "non_zero_exit":
          if (
            shellResult.stdout.includes("No local changes") ||
            shellResult.stderr.includes("No local changes")
          ) {
            return ok({ kind: "nothing_to_stash" });
          }
          return ok({
            kind: "error",
            message: shellResult.stderr || shellResult.stdout,
          });

        case "timeout":
          return ok({
            kind: "error",
            message: "Git stash vyprsel casovy limit",
          });

        case "spawn_error":
          return ok({ kind: "error", message: shellResult.message });
      }
    },

    status: async (): Promise<Result<GitStatusResult, string>> => {
      const result = await executeInDirectory(
        shellCommand("git status --porcelain"),
        repoPath as string,
        timeoutMs
      );

      const shellResult = result._unsafeUnwrap();

      switch (shellResult.kind) {
        case "success":
          if (shellResult.stdout.trim() === "") {
            return ok({ kind: "clean" });
          }

          {
            const modified: string[] = [];
            const untracked: string[] = [];

            for (const line of shellResult.stdout.split("\n")) {
              if (!line.trim()) continue;
              const status = line.substring(0, 2);
              const file = line.substring(3).trim();

              if (status === "??") {
                untracked.push(file);
              } else {
                modified.push(file);
              }
            }

            return ok({
              kind: "dirty",
              modifiedFiles: modified,
              untrackedFiles: untracked,
            });
          }

        case "non_zero_exit":
          return ok({
            kind: "error",
            message: shellResult.stderr || `Exit code: ${shellResult.exitCode}`,
          });

        case "timeout":
          return ok({
            kind: "error",
            message: "Git status vyprsel casovy limit",
          });

        case "spawn_error":
          return ok({ kind: "error", message: shellResult.message });
      }
    },

    fetch: async (): Promise<Result<void, string>> => {
      const result = await executeInDirectory(
        shellCommand("git fetch"),
        repoPath as string,
        timeoutMs
      );

      const shellResult = result._unsafeUnwrap();

      if (shellResult.kind === "success") {
        return ok(undefined);
      }

      return err(
        shellResult.kind === "spawn_error"
          ? shellResult.message
          : "Git fetch selhal"
      );
    },

    resetHard: async (): Promise<Result<void, string>> => {
      const result = await executeInDirectory(
        shellCommand("git reset --hard HEAD"),
        repoPath as string,
        timeoutMs
      );

      const shellResult = result._unsafeUnwrap();

      if (shellResult.kind === "success") {
        return ok(undefined);
      }

      return err(
        shellResult.kind === "spawn_error"
          ? shellResult.message
          : "Git reset selhal"
      );
    },
  };
}
