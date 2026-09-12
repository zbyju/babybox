import { defaultConfig } from "@babybox/config-schema";
import { describe, expect, it } from "vitest";

import { isInstanceOfConfig, isInstanceOfVersions } from "./instanceCheck";

describe("isInstanceOfConfig", () => {
  it("accepts the config configer sends", () => {
    expect(isInstanceOfConfig(defaultConfig())).toBe(true);
  });

  /* A box whose main.json grew a key we do not know still has to show its panel. */
  it("accepts a config with an unknown key", () => {
    expect(isInstanceOfConfig({ ...defaultConfig(), junk: "x" })).toBe(true);
  });

  it("rejects a config with a field of the wrong type", () => {
    const config = defaultConfig();
    config.units.engine = { ip: 10 } as unknown as { ip: string };

    expect(isInstanceOfConfig(config)).toBe(false);
  });

  // axios hands back a body it cannot parse as a string rather than throwing.
  it("rejects a body that is not a config", () => {
    expect(isInstanceOfConfig("<html>Not Found</html>")).toBe(false);
    expect(isInstanceOfConfig(null)).toBe(false);
  });
});

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
