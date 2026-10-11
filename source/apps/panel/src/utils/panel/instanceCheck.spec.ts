import { defaultConfig } from "@babybox/config-schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isInstanceOfConfig, isInstanceOfVersions } from "./instanceCheck";

type Fields = Record<string, unknown>;

function config(): Fields {
  return defaultConfig() as unknown as Fields;
}

function withSection(name: string, changes: Fields): Fields {
  const value = config();
  value[name] = { ...(value[name] as Fields), ...changes };
  return value;
}

describe("isInstanceOfConfig", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts the config configer sends", () => {
    expect(isInstanceOfConfig(defaultConfig())).toBe(true);
  });

  /* A box whose main.json grew a key we do not know still has to show its panel. */
  it("accepts a config with an unknown key", () => {
    expect(isInstanceOfConfig({ ...config(), junk: "x" })).toBe(true);
  });

  /*
   * The values below are the ones the panel handles itself: a refresh limit of 0
   * turns the reload off, and each delay falls back to a default. A PUT refuses
   * them, but a box that already holds one must still boot.
   */
  it("accepts a refresh limit of 0", () => {
    expect(
      isInstanceOfConfig(withSection("app", { refreshRequestLimit: 0 })),
    ).toBe(true);
  });

  it("accepts a refresh limit that is null or missing", () => {
    expect(
      isInstanceOfConfig(withSection("app", { refreshRequestLimit: null })),
    ).toBe(true);

    const value = config();
    const app = { ...(value["app"] as Fields) };
    delete app["refreshRequestLimit"];
    value["app"] = app;

    expect(isInstanceOfConfig(value)).toBe(true);
  });

  it("accepts a delay of 0", () => {
    expect(isInstanceOfConfig(withSection("units", { requestDelay: 0 }))).toBe(
      true,
    );
    expect(isInstanceOfConfig(withSection("camera", { updateDelay: 0 }))).toBe(
      true,
    );
  });

  /* getURLPostfix falls back, so one unknown name costs the camera, not the panel. */
  it("accepts a camera type it does not know", () => {
    expect(
      isInstanceOfConfig(withSection("camera", { cameraType: "axis" })),
    ).toBe(true);
  });

  it("rejects a missing section", () => {
    const value = config();
    delete value["units"];

    expect(isInstanceOfConfig(value)).toBe(false);
  });

  it("rejects a string where a number belongs", () => {
    expect(isInstanceOfConfig(withSection("backend", { port: "5000" }))).toBe(
      false,
    );
    expect(
      isInstanceOfConfig(withSection("units", { requestDelay: "2000" })),
    ).toBe(false);
  });

  it("rejects a config with a field of the wrong type", () => {
    expect(
      isInstanceOfConfig(withSection("units", { engine: { ip: 10 } })),
    ).toBe(false);
  });

  /* An unknown key is forgiven on its own, never together with a wrong value. */
  it("rejects an unknown key next to a wrong type", () => {
    const value = withSection("units", { engine: { ip: 10 } });

    expect(isInstanceOfConfig({ ...value, junk: 1 })).toBe(false);
  });

  // axios hands back a body it cannot parse as a string rather than throwing.
  it("rejects a body that is not a config", () => {
    expect(isInstanceOfConfig("<html>Not Found</html>")).toBe(false);
    expect(isInstanceOfConfig(null)).toBe(false);
    expect(isInstanceOfConfig([])).toBe(false);
  });

  it("warns with every schema error it lets through", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    isInstanceOfConfig(withSection("app", { refreshRequestLimit: 0 }));

    expect(warn).toHaveBeenCalledWith(expect.any(String), [
      { path: "app.refreshRequestLimit", msg: "must be at least 1" },
    ]);
  });

  it("says nothing about a config the schema accepts", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    isInstanceOfConfig(defaultConfig());

    expect(warn).not.toHaveBeenCalled();
  });
});

describe("isInstanceOfVersions", () => {
  const versions = {
    startup: "1.0.0",
    backend: "1.0.0",
    configer: "1.0.0",
    frontend: "1.0.0",
  };

  it("accepts a full versions body", () => {
    expect(isInstanceOfVersions(versions)).toBe(true);
  });

  it.each([
    ["startup", null],
    ["backend", 1],
    ["configer", {}],
    ["frontend", ["1.0.0"]],
  ])("rejects a %s that is not a string", (key, value) => {
    expect(isInstanceOfVersions({ ...versions, [key]: value })).toBe(false);
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
