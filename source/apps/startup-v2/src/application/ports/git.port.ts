/**
 * Git port - interface for git operations.
 */

import type { Result } from "neverthrow";
import type { GitPullResult, GitStashResult, GitStatusResult } from "../../domain/types/results";

export type GitPort = {
  readonly pull: () => Promise<Result<GitPullResult, string>>;
  readonly stash: () => Promise<Result<GitStashResult, string>>;
  readonly status: () => Promise<Result<GitStatusResult, string>>;
  readonly fetch: () => Promise<Result<void, string>>;
  readonly resetHard: () => Promise<Result<void, string>>;
};
