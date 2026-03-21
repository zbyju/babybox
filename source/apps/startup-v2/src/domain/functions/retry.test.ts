import { describe, expect, it } from "bun:test";
import {
  shouldRetryShellCommand,
  shouldRetryProcessStart,
  shouldRetryGitPull,
  calculateBackoff,
  DEFAULT_RETRY_CONFIG,
} from "./retry.js";
import type { ShellResult } from "../types/index.js";
import { GitPullResult, durationMs } from "../types/index.js";

describe("shouldRetryShellCommand", () => {
  describe("on success", () => {
    it("does not retry", () => {
      const result: ShellResult = {
        kind: "success",
        stdout: "ok",
        stderr: "",
        exitCode: 0,
        duration: durationMs(100),
      };
      const decision = shouldRetryShellCommand(result, 0);
      expect(decision.kind).toBe("give_up");
    });
  });

  describe("on timeout", () => {
    it("retries with backoff", () => {
      const result: ShellResult = {
        kind: "timeout",
        stdout: "",
        stderr: "",
        timeoutMs: durationMs(5000),
      };
      const decision = shouldRetryShellCommand(result, 0);
      expect(decision.kind).toBe("retry");
      if (decision.kind === "retry") {
        expect(decision.delayMs).toBeGreaterThan(0);
      }
    });

    it("gives up after max attempts", () => {
      const result: ShellResult = {
        kind: "timeout",
        stdout: "",
        stderr: "",
        timeoutMs: durationMs(5000),
      };
      const decision = shouldRetryShellCommand(result, DEFAULT_RETRY_CONFIG.maxAttempts);
      expect(decision.kind).toBe("give_up");
    });
  });

  describe("on spawn_error", () => {
    it("does not retry", () => {
      const result: ShellResult = {
        kind: "spawn_error",
        message: "command not found",
      };
      const decision = shouldRetryShellCommand(result, 0);
      expect(decision.kind).toBe("give_up");
    });
  });

  describe("on non_zero_exit", () => {
    it("retries for retryable exit codes (1)", () => {
      const result: ShellResult = {
        kind: "non_zero_exit",
        stdout: "",
        stderr: "error",
        exitCode: 1,
        duration: durationMs(100),
      };
      const decision = shouldRetryShellCommand(result, 0);
      expect(decision.kind).toBe("retry");
    });

    it("does not retry for non-retryable exit codes (2)", () => {
      const result: ShellResult = {
        kind: "non_zero_exit",
        stdout: "",
        stderr: "error",
        exitCode: 2,
        duration: durationMs(100),
      };
      const decision = shouldRetryShellCommand(result, 0);
      expect(decision.kind).toBe("give_up");
    });
  });

  describe("max attempts", () => {
    it("gives up when attempt equals maxAttempts", () => {
      const result: ShellResult = {
        kind: "timeout",
        stdout: "",
        stderr: "",
        timeoutMs: durationMs(5000),
      };
      const decision = shouldRetryShellCommand(result, 5);
      expect(decision.kind).toBe("give_up");
    });
  });
});

describe("shouldRetryProcessStart", () => {
  it("does not retry on started", () => {
    const decision = shouldRetryProcessStart({ kind: "started", pid: 123 }, 0);
    expect(decision.kind).toBe("give_up");
  });

  it("does not retry on already_running", () => {
    const decision = shouldRetryProcessStart({ kind: "already_running", pid: 123 }, 0);
    expect(decision.kind).toBe("give_up");
  });

  it("retries on failed", () => {
    const decision = shouldRetryProcessStart({ kind: "failed", message: "error" }, 0);
    expect(decision.kind).toBe("retry");
    if (decision.kind === "retry") {
      expect(decision.delayMs).toBeGreaterThan(0);
    }
  });

  it("gives up after max attempts", () => {
    const decision = shouldRetryProcessStart(
      { kind: "failed", message: "error" },
      DEFAULT_RETRY_CONFIG.maxAttempts
    );
    expect(decision.kind).toBe("give_up");
  });
});

describe("shouldRetryGitPull", () => {
  it("does not retry on success (updated)", () => {
    const decision = shouldRetryGitPull(GitPullResult.updated(1), 0);
    expect(decision.kind).toBe("give_up");
  });

  it("does not retry on already_up_to_date", () => {
    const decision = shouldRetryGitPull(GitPullResult.alreadyUpToDate(), 0);
    expect(decision.kind).toBe("give_up");
  });

  it("retries on network error", () => {
    const decision = shouldRetryGitPull(GitPullResult.networkError("timeout"), 0);
    expect(decision.kind).toBe("retry");
  });

  it("does not retry on conflict", () => {
    const decision = shouldRetryGitPull(GitPullResult.conflict(["file.ts"]), 0);
    expect(decision.kind).toBe("give_up");
  });

  it("does not retry on not_a_repository", () => {
    const decision = shouldRetryGitPull(GitPullResult.notARepository(), 0);
    expect(decision.kind).toBe("give_up");
  });

  it("retries on unknown_error for first attempts", () => {
    const decision = shouldRetryGitPull(GitPullResult.unknownError("mystery"), 0);
    expect(decision.kind).toBe("retry");
  });

  it("gives up on unknown_error after attempt 2", () => {
    const decision = shouldRetryGitPull(GitPullResult.unknownError("mystery"), 2);
    expect(decision.kind).toBe("give_up");
  });

  it("respects max attempts for network error", () => {
    const decision = shouldRetryGitPull(
      GitPullResult.networkError("timeout"),
      DEFAULT_RETRY_CONFIG.maxAttempts
    );
    expect(decision.kind).toBe("give_up");
  });
});

describe("calculateBackoff", () => {
  it("returns base delay for first attempt", () => {
    const delay = calculateBackoff(0);
    expect(delay).toBe(DEFAULT_RETRY_CONFIG.delayMs);
  });

  it("increases delay with attempts", () => {
    const delay0 = calculateBackoff(0);
    const delay1 = calculateBackoff(1);
    const delay2 = calculateBackoff(2);

    expect(delay1).toBeGreaterThan(delay0);
    expect(delay2).toBeGreaterThan(delay1);
  });

  it("caps at maxDelayMs", () => {
    const delay = calculateBackoff(100); // Very high attempt number
    expect(delay).toBeLessThanOrEqual(DEFAULT_RETRY_CONFIG.maxDelayMs);
  });

  it("respects custom config", () => {
    const config = {
      ...DEFAULT_RETRY_CONFIG,
      delayMs: 1000,
      backoffMultiplier: 2,
      maxDelayMs: 10000,
    };

    const delay0 = calculateBackoff(0, config);
    const delay1 = calculateBackoff(1, config);

    expect(delay0).toBe(1000);
    expect(delay1).toBe(2000);
  });
});
