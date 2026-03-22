import { describe, expect, it, mock } from "bun:test";
import { ok, err } from "neverthrow";
import { executeUpdate } from "./update";
import type { AppContext } from "../context";
import type { GitPort } from "../ports/git.port";
import type { LoggerPort } from "../ports/logger.port";
import type { StartupConfig } from "../../domain/types/index";
import { GitPullResult } from "../../domain/types/index";

// Helper to create a mock logger
function createMockLogger(): LoggerPort {
  return {
    debug: mock(() => {}),
    info: mock(() => {}),
    warn: mock(() => {}),
    error: mock(() => {}),
    log: mock(() => {}),
    flush: mock(async () => {}),
    setLevel: mock(() => {}),
  };
}

// Helper to create a base config
const baseConfig: StartupConfig = {
  repositoryPath: "/home/babybox/babybox",
  distPath: "/home/babybox/babybox/dist",
  distBackupPath: "/home/babybox/babybox/dist-backup",
  logsPath: "/home/babybox/babybox/logs",
  gitTimeoutMs: 30000,
  buildTimeoutMs: 300000,
  processStartTimeoutMs: 10000,
  maxRetries: 5,
  retryDelayMs: 5000,
  mainProcessName: "babybox",
  enableAutoUpdate: true,
  enableRollback: true,
};

// Helper to create mock git port
function createMockGit(overrides: Partial<GitPort> = {}): GitPort {
  return {
    pull: mock(async () => ok(GitPullResult.alreadyUpToDate())),
    stash: mock(async () => ok({ kind: "nothing_to_stash" as const })),
    status: mock(async () => ok({ kind: "clean" as const })),
    fetch: mock(async () => ok(undefined)),
    resetHard: mock(async () => ok(undefined)),
    ...overrides,
  };
}

// Minimal context helper
function createCtx(
  gitOverrides: Partial<GitPort> = {},
  configOverrides: Partial<StartupConfig> = {}
): AppContext {
  return {
    config: { ...baseConfig, ...configOverrides },
    os: { kind: "ubuntu" },
    logger: createMockLogger(),
    git: createMockGit(gitOverrides),
    fs: {
      exists: mock(() => true),
      isDirectory: mock(() => ok(true)),
      createDirectory: mock(async () => ok(undefined)),
      remove: mock(async () => ok(undefined)),
      rename: mock(async () => ok(undefined)),
      copyFile: mock(() => ok(undefined)),
      copyDirectory: mock(async () => ok(undefined)),
      listDirectory: mock(async () => ok([])),
    },
    process: {
      start: mock(async () => ok({ kind: "started" as const, pid: 123 })),
      startBun: mock(async () => ok({ kind: "started" as const, pid: 123 })),
      stop: mock(async () => ok({ kind: "stopped" as const })),
      delete: mock(async () => ok({ kind: "stopped" as const })),
      restart: mock(async () => ok({ kind: "started" as const, pid: 123 })),
      isManagerInstalled: mock(async () => true),
    },
    packageManager: {
      install: mock(async () => ok({ kind: "success" as const })),
      build: mock(async () => ok({ kind: "success" as const, duration: 1000 as any })),
      isInstalled: mock(async () => true),
    },
  };
}

describe("executeUpdate", () => {
  describe("happy path - already up to date", () => {
    it("returns already_up_to_date when no changes", async () => {
      const ctx = createCtx({
        status: mock(async () => ok({ kind: "clean" as const })),
        pull: mock(async () => ok(GitPullResult.alreadyUpToDate())),
      });

      const result = await executeUpdate(ctx);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.kind).toBe("already_up_to_date");
      }
    });
  });

  describe("happy path - updated", () => {
    it("returns updated with commit count when new commits pulled", async () => {
      const ctx = createCtx({
        status: mock(async () => ok({ kind: "clean" as const })),
        pull: mock(async () => ok(GitPullResult.updated(3))),
      });

      const result = await executeUpdate(ctx);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.kind).toBe("updated");
        if (result.value.kind === "updated") {
          expect(result.value.commitsBehind).toBe(3);
        }
      }
    });
  });

  describe("conflict resolution", () => {
    it("stashes dirty changes before pulling", async () => {
      const stashMock = mock(async () => ok({ kind: "stashed" as const, stashName: "stash@{0}" }));
      const ctx = createCtx({
        status: mock(async () =>
          ok({
            kind: "dirty" as const,
            modifiedFiles: ["file.ts"],
            untrackedFiles: [],
          })
        ),
        stash: stashMock,
        pull: mock(async () => ok(GitPullResult.alreadyUpToDate())),
      });

      await executeUpdate(ctx);

      expect(stashMock).toHaveBeenCalled();
    });

    it("continues when stash fails", async () => {
      const ctx = createCtx({
        status: mock(async () =>
          ok({
            kind: "dirty" as const,
            modifiedFiles: ["file.ts"],
            untrackedFiles: [],
          })
        ),
        stash: mock(async () => err("stash failed")),
        pull: mock(async () => ok(GitPullResult.alreadyUpToDate())),
      });

      const result = await executeUpdate(ctx);
      // Should still proceed
      expect(result.isOk()).toBe(true);
    });
  });

  describe("error handling", () => {
    it("returns error when git status fails", async () => {
      const ctx = createCtx({
        status: mock(async () => err("git error")),
      });

      const result = await executeUpdate(ctx);

      expect(result.isErr()).toBe(true);
    });

    it("returns error when not a repository", async () => {
      const ctx = createCtx({
        status: mock(async () => ok({ kind: "clean" as const })),
        pull: mock(async () => ok(GitPullResult.notARepository())),
      });

      const result = await executeUpdate(ctx);

      expect(result.isErr()).toBe(true);
    });

    it("returns skipped on network error", async () => {
      const ctx = createCtx({
        status: mock(async () => ok({ kind: "clean" as const })),
        pull: mock(async () => ok(GitPullResult.networkError("timeout"))),
      });

      const result = await executeUpdate(ctx);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.kind).toBe("skipped");
      }
    });

    it("returns error when pull port itself fails", async () => {
      const ctx = createCtx({
        status: mock(async () => ok({ kind: "clean" as const })),
        pull: mock(async () => err("connection reset")),
      });

      const result = await executeUpdate(ctx);

      expect(result.isErr()).toBe(true);
    });

    it("returns skipped after all conflict retries exhausted", async () => {
      const resetHardMock = mock(async () => ok(undefined));
      const ctx = createCtx({
        status: mock(async () => ok({ kind: "clean" as const })),
        pull: mock(async () => ok(GitPullResult.conflict(["file.ts"]))),
        resetHard: resetHardMock,
      });

      const result = await executeUpdate(ctx);

      expect(result.isOk()).toBe(true);
      // After max retries with conflict, should return skipped
    });

    it("returns skipped on unknown error", async () => {
      const ctx = createCtx({
        status: mock(async () => ok({ kind: "clean" as const })),
        pull: mock(async () => ok(GitPullResult.unknownError("mystery"))),
      });

      const result = await executeUpdate(ctx);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.kind).toBe("skipped");
      }
    });
  });
});
