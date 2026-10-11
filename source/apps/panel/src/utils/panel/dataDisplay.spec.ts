import { describe, expect, it } from "vitest";

import { daysToString, secondsToTime } from "./dataDisplay";

describe("daysToString", () => {
  it("uses 'dní' for zero", () => {
    expect(daysToString(0)).toBe("dní");
  });

  it("uses 'den' for one", () => {
    expect(daysToString(1)).toBe("den");
  });

  it("uses 'dny' for two to four", () => {
    expect(daysToString(2)).toBe("dny");
    expect(daysToString(4)).toBe("dny");
  });

  it("uses 'dní' for five and above", () => {
    expect(daysToString(5)).toBe("dní");
    expect(daysToString(42)).toBe("dní");
  });
});

describe("secondsToTime", () => {
  const ONE_DAY_ONE_HOUR_ONE_MINUTE_ONE_SECOND = 90061;

  it("shows days and time when the inspection count is unknown", () => {
    expect(
      secondsToTime(ONE_DAY_ONE_HOUR_ONE_MINUTE_ONE_SECOND, undefined),
    ).toBe("1 den 01:01:01");
  });

  it("shows days and time when no inspection is overdue", () => {
    expect(secondsToTime(ONE_DAY_ONE_HOUR_ONE_MINUTE_ONE_SECOND, 0)).toBe(
      "1 den 01:01:01",
    );
  });

  it("says the inspection was not done when it is overdue", () => {
    expect(secondsToTime(ONE_DAY_ONE_HOUR_ONE_MINUTE_ONE_SECOND, 3)).toBe(
      "Neprovedena",
    );
  });

  it("says the inspection was not done for negative seconds", () => {
    expect(secondsToTime(-1, undefined)).toBe("Neprovedena");
  });
});
