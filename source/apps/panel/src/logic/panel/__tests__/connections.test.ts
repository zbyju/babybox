import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ConnectionResult, ConnectionTracker } from "../connections";

/*
 * failStreakMs reads performance.now, so the tests move the fake clock with
 * advanceTimersByTime. setSystemTime would only move Date.now.
 */
describe("ConnectionTracker failStreakMs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stays at zero on the first failure", () => {
    const tracker = new ConnectionTracker();

    vi.advanceTimersByTime(5000);
    tracker.addResult(ConnectionResult.Fail);

    expect(tracker.failStreakMs).toBe(0);
  });

  it("measures from the first failure of the streak, not from the start", () => {
    const tracker = new ConnectionTracker();

    vi.advanceTimersByTime(5000);
    tracker.addResult(ConnectionResult.Fail);
    vi.advanceTimersByTime(12000);
    tracker.addResult(ConnectionResult.Fail);

    expect(tracker.failStreakMs).toBe(12000);
  });

  it("ignores time in which no result arrived", () => {
    const tracker = new ConnectionTracker();

    tracker.addResult(ConnectionResult.Fail);
    vi.advanceTimersByTime(600000);

    expect(tracker.failStreakMs).toBe(0);
  });

  it("resets on a success", () => {
    const tracker = new ConnectionTracker();

    tracker.addResult(ConnectionResult.Fail);
    vi.advanceTimersByTime(12000);
    tracker.addResult(ConnectionResult.Fail);
    vi.advanceTimersByTime(12000);
    tracker.addResult(ConnectionResult.Success);

    expect(tracker.failStreakMs).toBe(0);
  });

  it("restarts the clock on the next streak", () => {
    const tracker = new ConnectionTracker();

    tracker.addResult(ConnectionResult.Fail);
    vi.advanceTimersByTime(12000);
    tracker.addResult(ConnectionResult.Success);
    vi.advanceTimersByTime(12000);
    tracker.addResult(ConnectionResult.Fail);
    vi.advanceTimersByTime(12000);
    tracker.addResult(ConnectionResult.Fail);

    expect(tracker.failStreakMs).toBe(12000);
  });

  it("stays positive when the wall clock steps backward", () => {
    const tracker = new ConnectionTracker();

    tracker.addResult(ConnectionResult.Fail);
    vi.advanceTimersByTime(30000);
    vi.setSystemTime(Date.now() - 60000);
    tracker.addResult(ConnectionResult.Fail);

    expect(tracker.failStreakMs).toBe(30000);
  });
});
