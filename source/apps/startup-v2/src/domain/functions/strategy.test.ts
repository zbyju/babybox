import { describe, expect, it } from "bun:test";
import {
  determinePullStrategy,
  determineLocalChangesStrategy,
  decideBuild,
  determineBuildFailureStrategy,
  determineOverrideFailureStrategy,
} from "./strategy.js";
import { GitPullResult, BuildResult, OverrideResult } from "../types/index.js";
import type { GitStatusResult } from "../types/index.js";

describe("determinePullStrategy", () => {
  it("returns proceed_with_build for updated", () => {
    const result = determinePullStrategy(GitPullResult.updated(5));
    expect(result.kind).toBe("proceed_with_build");
  });

  it("returns skip_build for already_up_to_date", () => {
    const result = determinePullStrategy(GitPullResult.alreadyUpToDate());
    expect(result.kind).toBe("skip_build");
  });

  it("returns stash_and_retry for conflict", () => {
    const result = determinePullStrategy(GitPullResult.conflict(["file.ts"]));
    expect(result.kind).toBe("stash_and_retry");
  });

  it("returns skip_build for network_error", () => {
    const result = determinePullStrategy(
      GitPullResult.networkError("timeout")
    );
    expect(result.kind).toBe("skip_build");
  });

  it("returns abort for not_a_repository", () => {
    const result = determinePullStrategy(GitPullResult.notARepository());
    expect(result.kind).toBe("abort");
  });
});

describe("decideBuild", () => {
  const config = {
    repositoryPath: "/test",
    distPath: "/test/dist",
    distBackupPath: "/test/dist-backup",
    logsPath: "/test/logs",
    gitTimeoutMs: 30000,
    buildTimeoutMs: 300000,
    processStartTimeoutMs: 10000,
    maxRetries: 5,
    retryDelayMs: 5000,
    mainProcessName: "babybox",
    enableAutoUpdate: true,
    enableRollback: true,
  };

  it("builds when updated", () => {
    const result = decideBuild(GitPullResult.updated(1), true, config);
    expect(result.kind).toBe("build");
  });

  it("builds when dist does not exist", () => {
    const result = decideBuild(GitPullResult.alreadyUpToDate(), false, config);
    expect(result.kind).toBe("build");
  });

  it("skips build when up to date and dist exists", () => {
    const result = decideBuild(GitPullResult.alreadyUpToDate(), true, config);
    expect(result.kind).toBe("skip");
  });
});

describe("determineBuildFailureStrategy", () => {
  const configWithRollback = {
    repositoryPath: "/test",
    distPath: "/test/dist",
    distBackupPath: "/test/dist-backup",
    logsPath: "/test/logs",
    gitTimeoutMs: 30000,
    buildTimeoutMs: 300000,
    processStartTimeoutMs: 10000,
    maxRetries: 5,
    retryDelayMs: 5000,
    mainProcessName: "babybox",
    enableAutoUpdate: true,
    enableRollback: true,
  };

  it("returns rollback when backup exists", () => {
    const result = determineBuildFailureStrategy(
      BuildResult.compilationFailed("error", []),
      true,
      configWithRollback
    );
    expect(result.kind).toBe("rollback");
  });

  it("returns use_existing when no backup", () => {
    const result = determineBuildFailureStrategy(
      BuildResult.compilationFailed("error", []),
      false,
      configWithRollback
    );
    expect(result.kind).toBe("use_existing");
  });

  it("returns use_existing when rollback disabled", () => {
    const configNoRollback = { ...configWithRollback, enableRollback: false };
    const result = determineBuildFailureStrategy(
      BuildResult.compilationFailed("error", []),
      true, // backup exists but rollback disabled
      configNoRollback
    );
    expect(result.kind).toBe("use_existing");
  });
});

describe("determineLocalChangesStrategy", () => {
  it("always returns stash for clean status", () => {
    const status: GitStatusResult = { kind: "clean" };
    const result = determineLocalChangesStrategy(status);
    expect(result.kind).toBe("stash");
  });

  it("always returns stash for dirty status", () => {
    const status: GitStatusResult = {
      kind: "dirty",
      modifiedFiles: ["file.ts"],
      untrackedFiles: [],
    };
    const result = determineLocalChangesStrategy(status);
    expect(result.kind).toBe("stash");
  });

  it("always returns stash for error status", () => {
    const status: GitStatusResult = { kind: "error", message: "error" };
    const result = determineLocalChangesStrategy(status);
    expect(result.kind).toBe("stash");
  });
});

describe("determineOverrideFailureStrategy", () => {
  it("returns rollback when backup exists", () => {
    const result = determineOverrideFailureStrategy(
      OverrideResult.copyFailed("disk error"),
      true
    );
    expect(result.kind).toBe("rollback");
  });

  it("returns abort when no backup", () => {
    const result = determineOverrideFailureStrategy(
      OverrideResult.copyFailed("disk error"),
      false
    );
    expect(result.kind).toBe("abort");
  });

  it("returns rollback for backup_failed with backup available", () => {
    const result = determineOverrideFailureStrategy(
      OverrideResult.backupFailed("no space"),
      true
    );
    expect(result.kind).toBe("rollback");
  });
});
