import { createPinia, setActivePinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/units", () => ({
  getEngineData: vi.fn(),
  getThermalData: vi.fn(),
  updateWatchdog: vi.fn(),
  getStatus: vi.fn(),
}));

vi.mock("@/api/http", () => ({
  requestJson: vi.fn(),
}));

import { requestJson } from "@/api/http";
import {
  getEngineData,
  getStatus,
  getThermalData,
  updateWatchdog,
} from "@/api/units";

import { AppManager } from "../panelLoop";

const REQUEST_DELAY = 2000;
const LOOP_TICK = 250;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

/* Lets the awaited microtasks between two requests of one round run. */
const drain = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

/*
 * Moves the fake clock in single loop ticks and drains microtasks after each.
 * advanceTimersByTime on its own runs every interval callback back to back
 * with no microtask in between, so no round would ever get to settle.
 */
const step = async (ms: number) => {
  for (let elapsed = 0; elapsed < ms; elapsed += LOOP_TICK) {
    vi.advanceTimersByTime(LOOP_TICK);
    await drain();
  }
};

describe("AppManager unit loop", () => {
  let manager: AppManager;

  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    vi.mocked(getEngineData).mockResolvedValue(undefined);
    vi.mocked(getThermalData).mockResolvedValue(undefined);
    vi.mocked(updateWatchdog).mockResolvedValue(true);
    manager = new AppManager();
  });

  afterEach(() => {
    manager.stopPanelLoop();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("starts one round per unit right away", async () => {
    await manager.startPanelLoop();
    await drain();

    expect(updateWatchdog).toHaveBeenCalledTimes(1);
    expect(getEngineData).toHaveBeenCalledTimes(1);
    expect(getThermalData).toHaveBeenCalledTimes(1);
  });

  it("does not start a second round while the first is in flight", async () => {
    const pending = deferred<undefined>();
    vi.mocked(getEngineData).mockReturnValue(pending.promise);

    await manager.startPanelLoop();
    await drain();

    await step(REQUEST_DELAY * 5);

    expect(getEngineData).toHaveBeenCalledTimes(1);

    pending.resolve(undefined);
    await drain();
    await step(REQUEST_DELAY + LOOP_TICK);

    expect(getEngineData).toHaveBeenCalledTimes(2);
  });

  it("keeps the clock alive when a round never settles", async () => {
    const stuck = deferred<undefined>();
    vi.mocked(getEngineData).mockReturnValue(stuck.promise);

    await manager.startPanelLoop();
    await drain();

    await step(60000);

    // The engine round is parked, and the thermal clock kept going.
    expect(getEngineData).toHaveBeenCalledTimes(1);
    expect(vi.mocked(getThermalData).mock.calls.length).toBeGreaterThan(10);
  });

  it("keeps a dead engine unit from slowing the thermal readings", async () => {
    vi.mocked(getEngineData).mockRejectedValue(new Error("unreachable"));

    await manager.startPanelLoop();
    await drain();

    await step(REQUEST_DELAY * 6);

    expect(vi.mocked(getThermalData).mock.calls.length).toBeGreaterThan(3);
  });

  it("stops every clock on stopPanelLoop", async () => {
    await manager.startPanelLoop();
    await drain();
    const before = vi.mocked(getThermalData).mock.calls.length;

    manager.stopPanelLoop();
    await step(60000);

    expect(vi.mocked(getThermalData).mock.calls.length).toBe(before);
  });
});

describe("AppManager startup retries", () => {
  let manager: AppManager;

  beforeEach(() => {
    vi.useFakeTimers();
    setActivePinia(createPinia());
    vi.mocked(requestJson).mockRejectedValue(new Error("configer down"));
    vi.mocked(getStatus).mockRejectedValue(new Error("backend down"));
    manager = new AppManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("runs the first attempt without waiting", async () => {
    await manager.initializeGlobal();
    await drain();

    expect(getStatus).toHaveBeenCalledTimes(1);
  });

  it("backs the retries off from 5 s to 20 s", async () => {
    await manager.initializeGlobal();
    await drain();

    for (const [wait, calls] of [
      [5000, 2],
      [10000, 3],
      [20000, 4],
      [20000, 5],
    ] as const) {
      vi.advanceTimersByTime(wait - 1);
      await drain();
      expect(getStatus).toHaveBeenCalledTimes(calls - 1);

      vi.advanceTimersByTime(1);
      await drain();
      expect(getStatus).toHaveBeenCalledTimes(calls);
    }
  });

  it("stops retrying once both answer", async () => {
    vi.mocked(requestJson).mockRejectedValue(new Error("configer down"));
    vi.mocked(getStatus).mockResolvedValue(true);

    await manager.initializeGlobal();
    await drain();
    expect(getStatus).toHaveBeenCalledTimes(1);

    /* Config still fails, so the chain must keep going. */
    vi.advanceTimersByTime(5000);
    await drain();
    expect(getStatus).toHaveBeenCalledTimes(2);

    vi.mocked(requestJson).mockResolvedValue({ data: {} } as never);
    vi.advanceTimersByTime(10000);
    await drain();

    const settled = vi.mocked(getStatus).mock.calls.length;
    vi.advanceTimersByTime(60000);
    await drain();
    expect(getStatus).toHaveBeenCalledTimes(settled);
  });
});
