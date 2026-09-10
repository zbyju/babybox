import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectionResult, ConnectionTracker } from "../connections";

describe("ConnectionTracker failStreakMs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays at zero on the first failure", () => {
    const tracker = new ConnectionTracker();

    vi.setSystemTime(5000);
    tracker.addResult(ConnectionResult.Fail);

    expect(tracker.failStreakMs).toBe(0);
  });

  it("measures from the first failure of the streak, not from the start", () => {
    const tracker = new ConnectionTracker();

    vi.setSystemTime(5000);
    tracker.addResult(ConnectionResult.Fail);
    vi.setSystemTime(17000);
    tracker.addResult(ConnectionResult.Fail);

    expect(tracker.failStreakMs).toBe(12000);
  });

  it("ignores time in which no result arrived", () => {
    const tracker = new ConnectionTracker();

    tracker.addResult(ConnectionResult.Fail);
    vi.setSystemTime(600000);

    expect(tracker.failStreakMs).toBe(0);
  });

  it("resets on a success", () => {
    const tracker = new ConnectionTracker();

    tracker.addResult(ConnectionResult.Fail);
    vi.setSystemTime(12000);
    tracker.addResult(ConnectionResult.Fail);
    vi.setSystemTime(24000);
    tracker.addResult(ConnectionResult.Success);

    expect(tracker.failStreakMs).toBe(0);
  });

  it("restarts the clock on the next streak", () => {
    const tracker = new ConnectionTracker();

    tracker.addResult(ConnectionResult.Fail);
    vi.setSystemTime(12000);
    tracker.addResult(ConnectionResult.Success);
    vi.setSystemTime(24000);
    tracker.addResult(ConnectionResult.Fail);
    vi.setSystemTime(36000);
    tracker.addResult(ConnectionResult.Fail);

    expect(tracker.failStreakMs).toBe(12000);
  });
});
