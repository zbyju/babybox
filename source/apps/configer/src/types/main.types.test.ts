import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cameraTypes, parseMainConfig, validateMainConfig } from "./main.types";

const baseFile = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../configs/base.json"
);

function baseConfig(): Record<string, unknown> {
  return JSON.parse(readFileSync(baseFile, "utf-8")) as Record<string, unknown>;
}

describe("validateMainConfig", () => {
  it("accepts base.json", () => {
    expect(validateMainConfig(baseConfig())).toEqual([]);
  });

  it("rejects units without engine and thermal", () => {
    const config = baseConfig();
    const units = { ...(config.units as Record<string, unknown>) };
    delete units.engine;
    delete units.thermal;
    config.units = units;

    const paths = validateMainConfig(config).map((e) => e.path);
    expect(paths).toContain("units.engine");
    expect(paths).toContain("units.thermal");
  });

  it("rejects a unit ip that is not a string", () => {
    const config = baseConfig();
    config.units = { ...(config.units as object), engine: { ip: 10 } };

    expect(validateMainConfig(config)).toContainEqual({
      path: "units.engine.ip",
      msg: "must be a string",
    });
  });

  it("rejects a port outside 1..65535", () => {
    const config = baseConfig();
    config.configer = { ...(config.configer as object), port: 70000 };

    expect(validateMainConfig(config)).toEqual([
      { path: "configer.port", msg: "must be between 1 and 65535" },
    ]);
  });

  it("rejects a delay below 1", () => {
    const config = baseConfig();
    config.units = { ...(config.units as object), requestDelay: 0 };

    expect(validateMainConfig(config)).toEqual([
      { path: "units.requestDelay", msg: "must be at least 1" },
    ]);
  });

  it("accepts a negative voltage addition", () => {
    const config = baseConfig();
    const units = config.units as Record<string, unknown>;
    config.units = {
      ...units,
      voltage: { ...(units.voltage as object), addition: -5 },
    };

    expect(validateMainConfig(config)).toEqual([]);
  });

  it("rejects a missing startup key", () => {
    const config = baseConfig();
    delete config.startup;

    expect(validateMainConfig(config)).toContainEqual({
      path: "startup",
      msg: "must be an object",
    });
  });

  it("rejects a non-integer refreshRequestLimit", () => {
    const config = baseConfig();
    config.app = { ...(config.app as object), refreshRequestLimit: "50000" };

    expect(validateMainConfig(config)).toContainEqual({
      path: "app.refreshRequestLimit",
      msg: "must be an integer",
    });
  });

  it("accepts a config without refreshRequestLimit", () => {
    const config = baseConfig();
    const app = { ...(config.app as Record<string, unknown>) };
    delete app.refreshRequestLimit;
    config.app = app;

    expect(validateMainConfig(config)).toEqual([]);
  });

  for (const cameraType of cameraTypes) {
    it(`accepts the camera type ${cameraType}`, () => {
      const config = baseConfig();
      config.camera = { ...(config.camera as object), cameraType };

      expect(validateMainConfig(config)).toEqual([]);
    });
  }

  it("accepts a camera type in upper case", () => {
    const config = baseConfig();
    config.camera = { ...(config.camera as object), cameraType: "DAHUA" };

    expect(validateMainConfig(config)).toEqual([]);
  });

  it("rejects an unknown camera type", () => {
    const config = baseConfig();
    config.camera = { ...(config.camera as object), cameraType: "axis" };

    expect(validateMainConfig(config).map((e) => e.path)).toEqual([
      "camera.cameraType",
    ]);
  });

  it("rejects pc.os in a different case", () => {
    const config = baseConfig();
    config.pc = { ...(config.pc as object), os: "Ubuntu" };

    expect(validateMainConfig(config).map((e) => e.path)).toEqual(["pc.os"]);
  });

  it("rejects an unknown pc.os", () => {
    const config = baseConfig();
    config.pc = { ...(config.pc as object), os: "linux" };

    expect(validateMainConfig(config).map((e) => e.path)).toEqual(["pc.os"]);
  });

  it("rejects a non-object", () => {
    expect(validateMainConfig("nope")).toEqual([
      { path: "", msg: "must be an object" },
    ]);
  });
});

describe("parseMainConfig", () => {
  it("returns the config when it is valid", () => {
    const config = baseConfig();

    expect(parseMainConfig(config)).toEqual({ ok: true, config });
  });

  it("returns the errors when it is not", () => {
    expect(parseMainConfig("nope")).toEqual({
      ok: false,
      errors: [{ path: "", msg: "must be an object" }],
    });
  });
});
