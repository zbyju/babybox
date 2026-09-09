import { describe, expect, it } from "vitest";

import { daysToString } from "./dataDisplay";

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
