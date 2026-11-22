import moment from "moment";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../index.js", () => ({ config: null }));

import { restartRepository } from "../restart.js";
import type { RestartOs } from "../../fetch/readConfig.js";

describe("automatic restart", () => {
  it.each([
    ["-1", 20000],
    ["10oops", 20000],
    ["2147483648", 20000],
    ["1500", 1500],
  ])("schedules %s with delay %s", (raw, expected) => {
    const schedule = vi.fn();
    const repo = restartRepository(
      { RESTART_INTERVAL: raw, RESTART_ERROR_THRESHOLD: "bad" },
      schedule
    );
    expect(schedule).toHaveBeenCalledWith(expect.any(Function), expected);
    expect(repo.errorThreshold).toBe(9);
  });

  const cases: [RestartOs, string[]][] = [
    [{ status: "unsupported", value: "linux" }, []],
    [
      { status: "supported", value: "windows" },
      ["shutdown -r -t 60", "shutdown -a"],
    ],
    [
      { status: "supported", value: "ubuntu" },
      ["shutdown -r +1", "shutdown -c"],
    ],
  ];

  it.each(cases)("selects restart commands for %j", (os, commands) => {
    let tick = () => {};
    const run = vi.fn<(command: string) => void>();
    const repo = restartRepository(
      { RESTART_ERROR_THRESHOLD: "1", RESTART_INTERVAL: "1000" },
      (callback) => {
        tick = callback;
      },
      run,
      () => os
    );
    repo.lastRequest = moment().subtract(5, "seconds");
    tick();
    repo.onIncomingRequest();
    tick();
    expect(run.mock.calls.flat()).toEqual(commands);
  });
});
