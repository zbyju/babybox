import { cameraTypes } from "@babybox/config-schema";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getURLPostfix } from "./camera";

describe("getURLPostfix", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a path for every camera type", () => {
    for (const type of cameraTypes) expect(getURLPostfix(type)).toMatch(/^\//);
  });

  it("avm uses the avtech url", () => {
    expect(getURLPostfix("avm")).toBe(getURLPostfix("avtech"));
  });

  it("falls back to dahua for a name it does not know, and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(getURLPostfix("axis")).toBe(getURLPostfix("dahua"));
    expect(warn).toHaveBeenCalled();
  });
});
