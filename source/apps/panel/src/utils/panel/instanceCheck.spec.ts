import { describe, expect, it } from "vitest";

import { isInstanceOfVersions } from "./instanceCheck";

describe("isInstanceOfVersions", () => {
  it("accepts a full versions body", () => {
    expect(
      isInstanceOfVersions({
        startup: "1.0.0",
        backend: "1.0.0",
        configer: "1.0.0",
        frontend: "1.0.0",
      }),
    ).toBe(true);
  });

  // axios hands back a body it cannot parse as a string rather than throwing.
  it("rejects a body that is not JSON", () => {
    expect(isInstanceOfVersions("<html>Not Found</html>")).toBe(false);
    expect(isInstanceOfVersions("")).toBe(false);
  });

  it("rejects null", () => {
    expect(isInstanceOfVersions(null)).toBe(false);
  });

  it("rejects a body missing a field", () => {
    expect(
      isInstanceOfVersions({
        startup: "1.0.0",
        backend: "1.0.0",
        configer: "1.0.0",
      }),
    ).toBe(false);
  });
});
