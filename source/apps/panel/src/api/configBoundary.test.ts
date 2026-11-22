import { defaultConfig, versionsSchema } from "@babybox/config-schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { panelReadableConfigSchema } from "@/api/configBoundary";

const allowsConfig = (value: unknown) =>
  panelReadableConfigSchema.safeParse(value).success;
const allowsVersions = (value: unknown) =>
  versionsSchema.safeParse(value).success;

type Fields = Record<string, unknown>;

function withSection(
  name: keyof ReturnType<typeof defaultConfig>,
  changes: Fields,
): Fields {
  const value = defaultConfig();
  return { ...value, [name]: { ...value[name], ...changes } };
}

describe("allowsConfig", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts the config configer sends", () => {
    expect(allowsConfig(defaultConfig())).toBe(true);
  });

  /* A box whose main.json grew a key we do not know still has to show its panel. */
  it("accepts a config with an unknown key", () => {
    expect(allowsConfig({ ...defaultConfig(), junk: "x" })).toBe(true);
  });

  /*
   * The values below are the ones the panel handles itself: a refresh limit of 0
   * turns the reload off, and each delay falls back to a default. A PUT refuses
   * them, but a box that already holds one must still boot.
   */
  it("accepts a refresh limit of 0", () => {
    expect(allowsConfig(withSection("app", { refreshRequestLimit: 0 }))).toBe(
      true,
    );
  });

  it("accepts a refresh limit that is null or missing", () => {
    expect(
      allowsConfig(withSection("app", { refreshRequestLimit: null })),
    ).toBe(true);

    const value = defaultConfig();
    const app: Fields = { ...value.app };
    delete app["refreshRequestLimit"];

    expect(allowsConfig({ ...value, app })).toBe(true);
  });

  it("accepts a delay of 0", () => {
    expect(allowsConfig(withSection("units", { requestDelay: 0 }))).toBe(true);
    expect(allowsConfig(withSection("camera", { updateDelay: 0 }))).toBe(true);
  });

  /* getURLPostfix falls back, so one unknown name costs the camera, not the panel. */
  it("accepts a camera type it does not know", () => {
    expect(allowsConfig(withSection("camera", { cameraType: "axis" }))).toBe(
      true,
    );
  });

  it("rejects a missing section", () => {
    const value: Fields = { ...defaultConfig() };
    delete value["units"];

    expect(allowsConfig(value)).toBe(false);
  });

  it("rejects a string where a number belongs", () => {
    expect(allowsConfig(withSection("backend", { port: "5000" }))).toBe(false);
    expect(allowsConfig(withSection("units", { requestDelay: "2000" }))).toBe(
      false,
    );
  });

  it("rejects a config with a field of the wrong type", () => {
    expect(allowsConfig(withSection("units", { engine: { ip: 10 } }))).toBe(
      false,
    );
  });

  /* An unknown key is forgiven on its own, never together with a wrong value. */
  it("rejects an unknown key next to a wrong type", () => {
    const value = withSection("units", { engine: { ip: 10 } });

    expect(allowsConfig({ ...value, junk: 1 })).toBe(false);
  });

  // axios hands back a body it cannot parse as a string rather than throwing.
  it("rejects a body that is not a config", () => {
    expect(allowsConfig("<html>Not Found</html>")).toBe(false);
    expect(allowsConfig(null)).toBe(false);
    expect(allowsConfig([])).toBe(false);
  });

  it("warns with every schema error it lets through", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    allowsConfig(withSection("app", { refreshRequestLimit: 0 }));

    expect(warn).toHaveBeenCalledWith(expect.any(String), [
      { path: "app.refreshRequestLimit", msg: "must be at least 1" },
    ]);
  });

  it("says nothing about a config the schema accepts", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    allowsConfig(defaultConfig());

    expect(warn).not.toHaveBeenCalled();
  });
});

describe("allowsVersions", () => {
  const versions = {
    startup: "1.0.0",
    backend: "1.0.0",
    configer: "1.0.0",
    frontend: "1.0.0",
  };

  it("accepts a full versions body", () => {
    expect(allowsVersions(versions)).toBe(true);
  });

  it.each([
    ["startup", null],
    ["backend", 1],
    ["configer", {}],
    ["frontend", ["1.0.0"]],
  ])("rejects a %s that is not a string", (key, value) => {
    expect(allowsVersions({ ...versions, [key]: value })).toBe(false);
  });

  // axios hands back a body it cannot parse as a string rather than throwing.
  it("rejects a body that is not JSON", () => {
    expect(allowsVersions("<html>Not Found</html>")).toBe(false);
    expect(allowsVersions("")).toBe(false);
  });

  it("rejects null", () => {
    expect(allowsVersions(null)).toBe(false);
  });

  it("rejects a body missing a field", () => {
    expect(
      allowsVersions({
        startup: "1.0.0",
        backend: "1.0.0",
        configer: "1.0.0",
      }),
    ).toBe(false);
  });
});
