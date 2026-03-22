import { describe, expect, it, mock } from "bun:test";
import { ok, err } from "neverthrow";
import { executeBuild } from "../build";
import type { AppContext } from "../../context";
import type { LoggerPort } from "../../ports/logger.port";
import type { StartupConfig } from "../../../domain/types/config";
import { BuildResult } from "../../../domain/types/results";
import { durationMs } from "../../../domain/types/branded";

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

function createCtx(packageManagerOverrides = {}): AppContext {
  return {
    config: baseConfig,
    os: { kind: "ubuntu" },
    logger: createMockLogger(),
    git: {
      pull: mock(async () => ok({ kind: "already_up_to_date" as const })),
      stash: mock(async () => ok({ kind: "nothing_to_stash" as const })),
      status: mock(async () => ok({ kind: "clean" as const })),
      fetch: mock(async () => ok(undefined)),
      resetHard: mock(async () => ok(undefined)),
    },
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
      build: mock(async () => ok(BuildResult.success(durationMs(5000)))),
      isInstalled: mock(async () => true),
      ...packageManagerOverrides,
    },
  };
}

describe("executeBuild", () => {
  describe("when shouldBuild is false", () => {
    it("skips build without calling package manager", async () => {
      const installMock = mock(async () => ok({ kind: "success" as const }));
      const ctx = createCtx({ install: installMock });

      const result = await executeBuild(ctx, false, "Jiz sestaven");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.kind).toBe("skipped");
      }
      expect(installMock).not.toHaveBeenCalled();
    });

    it("uses default skip reason when none provided", async () => {
      const ctx = createCtx();
      const result = await executeBuild(ctx, false);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.kind).toBe("skipped");
      }
    });
  });

  describe("when shouldBuild is true - happy path", () => {
    it("returns success after install and build", async () => {
      const ctx = createCtx();
      const result = await executeBuild(ctx, true);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.kind).toBe("success");
      }
    });
  });

  describe("when shouldBuild is true - install failures", () => {
    it("returns error when install port fails", async () => {
      const ctx = createCtx({
        install: mock(async () => err("disk full")),
      });

      const result = await executeBuild(ctx, true);
      expect(result.isErr()).toBe(true);
    });

    it("returns failed when bun not found", async () => {
      const ctx = createCtx({
        install: mock(async () => ok({ kind: "bun_not_found" as const })),
      });

      const result = await executeBuild(ctx, true);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.kind).toBe("failed");
      }
    });

    it("returns failed when install_failed", async () => {
      const ctx = createCtx({
        install: mock(async () =>
          ok({ kind: "install_failed" as const, message: "network error" }),
        ),
      });

      const result = await executeBuild(ctx, true);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.kind).toBe("failed");
      }
    });
  });

  describe("when shouldBuild is true - build failures", () => {
    it("returns error when build port fails", async () => {
      const ctx = createCtx({
        build: mock(async () => err("build crashed")),
      });

      const result = await executeBuild(ctx, true);
      expect(result.isErr()).toBe(true);
    });

    it("returns failed on compilation error", async () => {
      const ctx = createCtx({
        build: mock(async () =>
          ok(BuildResult.compilationFailed("TS errors", ["error1", "error2"])),
        ),
      });

      const result = await executeBuild(ctx, true);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.kind).toBe("failed");
      }
    });

    it("returns failed on dependency_install_failed in build", async () => {
      const ctx = createCtx({
        build: mock(async () => ok(BuildResult.dependencyInstallFailed("npm error"))),
      });

      const result = await executeBuild(ctx, true);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.kind).toBe("failed");
      }
    });
  });
});
