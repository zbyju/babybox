import { describe, expect, it } from "vitest";

import { defaultConfig } from "./defaults";
import { cameraTypes, pcOsTypes } from "./schema";
import { isMainConfig, parseMainConfig, validateMainConfig } from "./validate";

type Fields = Record<string, unknown>;

// A fresh copy per test, so one test cannot change what the next one starts from.
function config(): Fields {
  return defaultConfig() as unknown as Fields;
}

function withUnits(changes: Fields): Fields {
  const base = config();
  base.units = { ...(base.units as Fields), ...changes };
  return base;
}

describe("validateMainConfig", () => {
  it("accepts the defaults", () => {
    expect(validateMainConfig(config())).toEqual([]);
  });

  it("rejects a value that is not an object", () => {
    expect(validateMainConfig("nope")).toEqual([
      { path: "", msg: "must be an object" },
    ]);
  });

  it("rejects a missing section", () => {
    const value = config();
    delete value.units;

    expect(validateMainConfig(value)).toEqual([
      { path: "units", msg: "must be an object" },
    ]);
  });

  it("rejects units without engine and thermal", () => {
    const units = { ...(config().units as Fields) };
    delete units.engine;
    delete units.thermal;

    expect(validateMainConfig({ ...config(), units })).toEqual([
      { path: "units.engine", msg: "must be an object" },
      { path: "units.thermal", msg: "must be an object" },
    ]);
  });

  it("rejects a section that is not an object", () => {
    const value = config();
    value.babybox = "Nenastaveno";

    expect(validateMainConfig(value)).toEqual([
      { path: "babybox", msg: "must be an object" },
    ]);
  });

  it("rejects a string field that is not a string", () => {
    const value = withUnits({ engine: { ip: 10 } });

    expect(validateMainConfig(value)).toEqual([
      { path: "units.engine.ip", msg: "must be a string" },
    ]);
  });

  it("rejects a number where a string belongs and a string where a number belongs", () => {
    const value = config();
    value.camera = { ...(value.camera as Fields), ip: 7, updateDelay: "1000" };

    expect(validateMainConfig(value)).toEqual([
      { path: "camera.ip", msg: "must be a string" },
      { path: "camera.updateDelay", msg: "must be an integer" },
    ]);
  });

  it("rejects a number that is not whole", () => {
    const value = withUnits({ requestDelay: 1.5 });

    expect(validateMainConfig(value)).toEqual([
      { path: "units.requestDelay", msg: "must be an integer" },
    ]);
  });

  it("rejects a port outside 1..65535", () => {
    const value = config();
    value.configer = { ...(value.configer as Fields), port: 70000 };

    expect(validateMainConfig(value)).toEqual([
      { path: "configer.port", msg: "must be between 1 and 65535" },
    ]);
  });

  it("rejects a delay below 1", () => {
    expect(validateMainConfig(withUnits({ requestDelay: 0 }))).toEqual([
      { path: "units.requestDelay", msg: "must be at least 1" },
    ]);
  });

  it("accepts a negative voltage addition", () => {
    const units = config().units as Fields;
    const value = withUnits({
      voltage: { ...(units.voltage as Fields), addition: -5 },
    });

    expect(validateMainConfig(value)).toEqual([]);
  });

  /* startup is left out on purpose: it takes any key. */
  for (const path of [
    "",
    "babybox",
    "backend",
    "configer",
    "units",
    "units.engine",
    "units.thermal",
    "units.voltage",
    "camera",
    "pc",
    "app",
  ]) {
    it(`rejects an unknown key under ${path || "the root"}`, () => {
      const value = config();
      let target = value;
      for (const key of path.split(".").filter(Boolean)) {
        target = target[key] as Fields;
      }
      target.junk = 1;

      expect(validateMainConfig(value)).toEqual([
        { path: path ? `${path}.junk` : "junk", msg: "unknown key" },
      ]);
    });
  }

  it("reports every unknown key of an object on its own", () => {
    const value = config();
    value.pc = { ...(value.pc as Fields), first: 1, second: 2 };

    expect(validateMainConfig(value)).toEqual([
      { path: "pc.first", msg: "unknown key" },
      { path: "pc.second", msg: "unknown key" },
    ]);
  });

  it("accepts any key under startup", () => {
    const value = config();
    value.startup = { anything: true };

    expect(validateMainConfig(value)).toEqual([]);
  });

  it("rejects a missing startup key", () => {
    const value = config();
    delete value.startup;

    expect(validateMainConfig(value)).toEqual([
      { path: "startup", msg: "must be an object" },
    ]);
  });

  it("accepts a config without refreshRequestLimit", () => {
    const value = config();
    const app = { ...(value.app as Fields) };
    delete app.refreshRequestLimit;
    value.app = app;

    expect(validateMainConfig(value)).toEqual([]);
  });

  it("rejects a refreshRequestLimit that is not an integer", () => {
    const value = config();
    value.app = { ...(value.app as Fields), refreshRequestLimit: "50000" };

    expect(validateMainConfig(value)).toEqual([
      { path: "app.refreshRequestLimit", msg: "must be an integer" },
    ]);
  });

  for (const cameraType of cameraTypes) {
    it(`accepts the camera type ${cameraType}`, () => {
      const value = config();
      value.camera = { ...(value.camera as Fields), cameraType };

      expect(validateMainConfig(value)).toEqual([]);
    });
  }

  for (const os of pcOsTypes) {
    it(`accepts the pc os ${os}`, () => {
      const value = config();
      value.pc = { os };

      expect(validateMainConfig(value)).toEqual([]);
    });
  }

  it("rejects a camera type in a different case", () => {
    const value = config();
    value.camera = { ...(value.camera as Fields), cameraType: "DAHUA" };

    expect(validateMainConfig(value)).toEqual([
      {
        path: "camera.cameraType",
        msg: "must be one of: dahua, hikvision, avtech, avm, vivotek",
      },
    ]);
  });

  it("rejects an unknown camera type", () => {
    const value = config();
    value.camera = { ...(value.camera as Fields), cameraType: "axis" };

    expect(validateMainConfig(value).map((e) => e.path)).toEqual([
      "camera.cameraType",
    ]);
  });

  it("rejects pc.os in a different case", () => {
    const value = config();
    value.pc = { os: "Ubuntu" };

    expect(validateMainConfig(value)).toEqual([
      { path: "pc.os", msg: "must be one of: windows, ubuntu" },
    ]);
  });

  it("rejects an unknown pc.os", () => {
    const value = config();
    value.pc = { os: "linux" };

    expect(validateMainConfig(value).map((e) => e.path)).toEqual(["pc.os"]);
  });

  it("reports a problem in every section at once", () => {
    const value = config();
    value.babybox = { name: 1 };
    value.pc = { os: "linux" };

    expect(validateMainConfig(value).map((e) => e.path)).toEqual([
      "babybox.name",
      "pc.os",
    ]);
  });
});

describe("parseMainConfig", () => {
  it("returns the config when it is valid", () => {
    expect(parseMainConfig(config())).toEqual({
      ok: true,
      config: defaultConfig(),
    });
  });

  it("keeps the keys of startup", () => {
    const value = config();
    value.startup = { anything: true };

    const result = parseMainConfig(value);
    expect(result.ok && result.config.startup).toEqual({ anything: true });
  });

  it("returns the errors when it is not", () => {
    expect(parseMainConfig("nope")).toEqual({
      ok: false,
      errors: [{ path: "", msg: "must be an object" }],
    });
  });
});

describe("isMainConfig", () => {
  it("accepts a valid config", () => {
    expect(isMainConfig(config())).toBe(true);
  });

  it("accepts a config with a key we do not know", () => {
    const value = config();
    value.camera = { ...(value.camera as Fields), zoom: 2 };

    expect(isMainConfig({ ...value, junk: "x" })).toBe(true);
  });

  it("rejects a config with a field of the wrong type", () => {
    expect(isMainConfig(withUnits({ engine: { ip: 10 } }))).toBe(false);
  });

  it("rejects a body that is not a config", () => {
    expect(isMainConfig("<html>Not Found</html>")).toBe(false);
    expect(isMainConfig(null)).toBe(false);
    expect(isMainConfig([])).toBe(false);
  });
});
