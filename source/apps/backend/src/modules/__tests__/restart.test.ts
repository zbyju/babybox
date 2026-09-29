import { afterEach, describe, expect, it, vi } from "vitest";

const exec = vi.fn();

async function loadRepo() {
  vi.resetModules();
  vi.doMock("child_process", () => ({ exec }));
  vi.doMock("winston", () => ({
    default: {
      createLogger: () => ({ info: () => undefined }),
      format: { json: () => ({}) },
        transports: { File: vi.fn() },
    },
  }));
  vi.doMock("../../index.js", () => ({
    config: { pc: { os: "windows" } },
  }));
  const { restartRepository } = await import("../restart.js");
  return restartRepository();
}

describe("restartRepository", () => {
  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.resetModules();
    delete process.env["RESTART_INTERVAL"];
    delete process.env["RESTART_ERROR_THRESHOLD"];
    exec.mockReset();
  });

  it("shows the request time after onIncomingRequest", async () => {
    vi.useFakeTimers();
    const repo = await loadRepo();

    expect(repo.lastRequest).toBeNull();
    repo.onIncomingRequest();

    expect(repo.lastRequest?.isValid()).toBe(true);
  });

  it("shows the error streak after requests stop", async () => {
    vi.useFakeTimers();
    process.env["RESTART_INTERVAL"] = "1000";
    process.env["RESTART_ERROR_THRESHOLD"] = "9";
    const repo = await loadRepo();
    repo.onIncomingRequest();

    /*
     * The first tick is 1 s after the request. That gap equals the interval,
     * so the streak stays 0. The next tick adds 1.
     */
    vi.advanceTimersByTime(1000);
    expect(repo.errorStreak).toBe(0);

    vi.advanceTimersByTime(1000);
    expect(repo.errorStreak).toBe(1);
    expect(exec).not.toHaveBeenCalled();
  });
});
