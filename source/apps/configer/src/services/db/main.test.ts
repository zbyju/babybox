import {
  copyFileSync,
  existsSync,
  fsyncSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  defaultConfig,
  parseMainConfig,
  validateMainConfig,
} from "@babybox/config-schema";
import type { MainConfig } from "@babybox/config-schema";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultConfigDir, mainConfig } from "./main";

// Pass-through spies: a test can check the call order or make one call throw.
vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    fsyncSync: vi.fn(actual.fsyncSync),
    readFileSync: vi.fn(actual.readFileSync),
    renameSync: vi.fn(actual.renameSync),
  };
});

const repoBase = join(defaultConfigDir, "base.json");

let configDir: string;

function file(name: string): string {
  return join(configDir, name);
}

function readJson(name: string): Record<string, unknown> {
  return JSON.parse(readFileSync(file(name), "utf-8")) as Record<
    string,
    unknown
  >;
}

function base(): MainConfig {
  return JSON.parse(readFileSync(repoBase, "utf-8")) as MainConfig;
}

beforeEach(() => {
  configDir = mkdtempSync(join(tmpdir(), "configer-"));
  copyFileSync(repoBase, file("base.json"));
});

afterEach(() => {
  rmSync(configDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("boot", () => {
  it("boots from base.json when there is no main.json, and writes nothing", async () => {
    const db = await mainConfig(configDir);

    expect(db.data()).toEqual(base());
    expect(existsSync(file("main.json"))).toBe(false);
    expect(existsSync(file("main.json.bak"))).toBe(false);
  });

  it("leaves main.json and main.json.bak as they are", async () => {
    writeFileSync(file("main.json"), '{"babybox":{"name":"Praha"}}');
    writeFileSync(file("main.json.bak"), '{"babybox":{"name":"Brno"}}');

    await mainConfig(configDir);

    expect(readFileSync(file("main.json"), "utf-8")).toBe(
      '{"babybox":{"name":"Praha"}}'
    );
    expect(readFileSync(file("main.json.bak"), "utf-8")).toBe(
      '{"babybox":{"name":"Brno"}}'
    );
  });

  it("keeps the stored values and fills in the missing ones", async () => {
    writeFileSync(
      file("main.json"),
      JSON.stringify({ babybox: { name: "Praha" } })
    );

    const db = await mainConfig(configDir);

    expect(db.data().babybox.name).toBe("Praha");
    expect(db.data().units.engine.ip).toBe("10.1.1.5");
  });

  it("boots with a stored value PUT would reject, and warns", async () => {
    writeFileSync(
      file("main.json"),
      JSON.stringify({ configer: { port: "8080" } })
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const db = await mainConfig(configDir);

    expect(db.data().configer.port).toBe("8080");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("configer.port"));
  });

  it("boots from main.json.bak when main.json does not parse", async () => {
    writeFileSync(
      file("main.json.bak"),
      JSON.stringify({ babybox: { name: "ze zalohy" } })
    );
    writeFileSync(file("main.json"), "{ not json");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const db = await mainConfig(configDir);

    expect(db.data().babybox.name).toBe("ze zalohy");
    expect(warn).toHaveBeenCalled();
  });

  it("treats a main.json that is not an object as corrupt", async () => {
    const backup = { babybox: { name: "ze zalohy" } };
    writeFileSync(file("main.json.bak"), JSON.stringify(backup));
    writeFileSync(file("main.json"), '"abc"');
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const db = await mainConfig(configDir);

    expect(db.data().babybox.name).toBe("ze zalohy");
    expect(readJson("main.json.bak")).toEqual(backup);
  });

  it("falls back to main.json.bak when main.json cannot be read", async () => {
    const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
    writeFileSync(
      file("main.json.bak"),
      JSON.stringify({ babybox: { name: "ze zalohy" } })
    );
    writeFileSync(file("main.json"), JSON.stringify({ babybox: { name: "x" } }));
    vi.mocked(readFileSync).mockImplementation(((path, options) => {
      if (String(path).endsWith("main.json")) {
        throw Object.assign(new Error("EACCES: permission denied"), {
          code: "EACCES",
        });
      }
      return actual.readFileSync(path, options);
    }) as typeof readFileSync);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const db = await mainConfig(configDir);

    expect(db.data().babybox.name).toBe("ze zalohy");
    expect(error).toHaveBeenCalledWith(expect.stringContaining("EACCES"));
  });

  it("leaves an unreadable main.json in place", async () => {
    writeFileSync(file("main.json"), "{ not json");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await mainConfig(configDir);

    expect(readFileSync(file("main.json"), "utf-8")).toBe("{ not json");
  });

  it("falls back to base.json when both files are corrupt", async () => {
    writeFileSync(file("main.json"), "{ not json");
    writeFileSync(file("main.json.bak"), "also not json");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const db = await mainConfig(configDir);

    expect(db.data()).toEqual(base());
    expect(error).toHaveBeenCalled();
  });
});

describe("update", () => {
  it("fills a partial body from base.json, not from the stored config", async () => {
    const db = await mainConfig(configDir);
    await db.update({ camera: { ip: "10.1.1.99" } });

    const result = await db.update({ babybox: { name: "Brno" } });

    expect(result.status).toBe("saved");
    expect(readJson("main.json")).toEqual({
      ...base(),
      babybox: { name: "Brno" },
    });
  });

  it("rejects an invalid body and writes nothing", async () => {
    const db = await mainConfig(configDir);

    const result = await db.update({ units: { engine: { ip: 5 } } });

    expect(result).toEqual({
      status: "invalid",
      errors: [{ path: "units.engine.ip", msg: "must be a string" }],
    });
    expect(existsSync(file("main.json"))).toBe(false);
    expect(db.data()).toEqual(base());
  });

  it("rejects an integer outside its range", async () => {
    const db = await mainConfig(configDir);

    const result = await db.update({ configer: { port: 70000 } });

    expect(result).toEqual({
      status: "invalid",
      errors: [{ path: "configer.port", msg: "must be between 1 and 65535" }],
    });
  });

  it("rejects a value outside the enum", async () => {
    const db = await mainConfig(configDir);

    const result = await db.update({ camera: { cameraType: "foscam" } });

    expect(result).toEqual({
      status: "invalid",
      errors: [
        {
          path: "camera.cameraType",
          msg: "must be one of: dahua, hikvision, avtech, avm, vivotek",
        },
      ],
    });
  });

  it("reports one error per unknown key, with a dotted path", async () => {
    const db = await mainConfig(configDir);

    const result = await db.update({ camera: { zoom: 2, ip2: "10.1.1.8" } });

    expect(result).toEqual({
      status: "invalid",
      errors: [
        { path: "camera.zoom", msg: "unknown key" },
        { path: "camera.ip2", msg: "unknown key" },
      ],
    });
  });

  it("rejects a non-object body and writes nothing", async () => {
    const db = await mainConfig(configDir);

    const result = await db.update([]);

    expect(result).toEqual({
      status: "invalid",
      errors: [{ path: "", msg: "must be an object" }],
    });
    expect(existsSync(file("main.json"))).toBe(false);
  });

  it("rejects an empty body and writes nothing", async () => {
    const db = await mainConfig(configDir);
    await db.update({ babybox: { name: "Brno" } });
    const before = readFileSync(file("main.json"), "utf-8");

    const result = await db.update({});

    expect(result).toEqual({
      status: "invalid",
      errors: [{ path: "", msg: "must not be empty" }],
    });
    expect(readFileSync(file("main.json"), "utf-8")).toBe(before);
  });

  it("keeps the previous content in main.json.bak", async () => {
    const db = await mainConfig(configDir);
    await db.update({ babybox: { name: "prvni" } });

    await db.update({ babybox: { name: "druhy" } });

    expect(readJson("main.json.bak")).toEqual({
      ...base(),
      babybox: { name: "prvni" },
    });
    expect(readJson("main.json")).toEqual({
      ...base(),
      babybox: { name: "druhy" },
    });
  });

  it("keeps the old config in memory and on disk when the write fails", async () => {
    const db = await mainConfig(configDir);
    await db.update({ babybox: { name: "prvni" } });
    vi.mocked(fsyncSync).mockImplementationOnce(() => {
      throw Object.assign(new Error("no space left on device"), {
        code: "ENOSPC",
      });
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await db.update({ babybox: { name: "druhy" } });

    expect(result).toEqual({
      status: "write-failed",
      msg: "cannot write main.json: no space left on device",
    });
    expect(db.data().babybox.name).toBe("prvni");
    expect(readJson("main.json")).toEqual({
      ...base(),
      babybox: { name: "prvni" },
    });
  });

  it("fsyncs the data before the rename and the directory after it", async () => {
    const db = await mainConfig(configDir);
    vi.mocked(fsyncSync).mockClear();
    vi.mocked(renameSync).mockClear();

    await db.update({ babybox: { name: "Brno" } });

    const [dataSync, dirSync] = vi.mocked(fsyncSync).mock.invocationCallOrder;
    const [rename] = vi.mocked(renameSync).mock.invocationCallOrder;
    expect(dataSync).toBeLessThan(rename);
    expect(rename).toBeLessThan(dirSync);
  });

  it("keeps the config before the last write in main.json.bak across a reboot", async () => {
    writeFileSync(
      file("main.json"),
      JSON.stringify({ babybox: { name: "Praha" } })
    );
    const first = await mainConfig(configDir);
    await first.update({ babybox: { name: "Brno" } });

    await mainConfig(configDir);

    expect(readJson("main.json.bak")).toEqual({ babybox: { name: "Praha" } });
    expect(readJson("main.json").babybox).toEqual({ name: "Brno" });
  });

  it("never copies a corrupt main.json over main.json.bak", async () => {
    const backup = { babybox: { name: "ze zalohy" } };
    writeFileSync(file("main.json.bak"), JSON.stringify(backup));
    writeFileSync(file("main.json"), "{ not json");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const db = await mainConfig(configDir);

    await db.update({ babybox: { name: "Brno" } });

    expect(readJson("main.json.bak")).toEqual(backup);
    expect(readJson("main.json").babybox).toEqual({ name: "Brno" });
  });

  it("leaves no temp file behind", async () => {
    const db = await mainConfig(configDir);

    await db.update({ babybox: { name: "Brno" } });

    expect(existsSync(file("main.json.tmp"))).toBe(false);
  });

  /* A PUT of the config the box already runs on is the form saving an untouched
   * page. It must not rotate main.json.bak away either. */
  it("writes nothing for a body that changes nothing", async () => {
    const db = await mainConfig(configDir);
    await db.update({ babybox: { name: "prvni" } });
    await db.update({ babybox: { name: "druhy" } });

    const result = await db.update(db.data());

    expect(result.status).toBe("saved");
    expect(readJson("main.json.bak").babybox).toEqual({ name: "prvni" });
    expect(readJson("main.json").babybox).toEqual({ name: "druhy" });
  });

  it("rejects a change to configer.port and writes nothing", async () => {
    const db = await mainConfig(configDir);

    const result = await db.update({
      ...base(),
      configer: { ...base().configer, port: 5555 },
    });

    expect(result).toEqual({
      status: "invalid",
      errors: [
        {
          path: "configer.port",
          msg: "must stay 5001: it changes only by editing main.json and restarting configer",
        },
      ],
    });
    expect(existsSync(file("main.json"))).toBe(false);
  });
});

describe("patch", () => {
  /* The counterpart of update's "fills a partial body from base.json": same two
   * writes, and camera.ip survives the second one instead of going back. */
  it("keeps the stored value of a key the body leaves out", async () => {
    const db = await mainConfig(configDir);
    await db.update({ camera: { ip: "10.1.1.99" } });

    const result = await db.patch({ babybox: { name: "Brno" } });

    expect(result.status).toBe("saved");
    expect(readJson("main.json")).toEqual({
      ...base(),
      babybox: { name: "Brno" },
      camera: { ...base().camera, ip: "10.1.1.99" },
    });
  });

  it("writes the keys in the schema's order", async () => {
    writeFileSync(
      file("main.json"),
      JSON.stringify({ app: { password: "x" }, babybox: { name: "Praha" } })
    );
    const db = await mainConfig(configDir);

    await db.patch({ babybox: { name: "Brno" } });

    expect(readFileSync(file("main.json"), "utf-8")).toBe(
      JSON.stringify(
        {
          ...base(),
          babybox: { name: "Brno" },
          app: { ...base().app, password: "x" },
        },
        null,
        2
      )
    );
  });

  it("keeps the config from before the write in main.json.bak", async () => {
    const db = await mainConfig(configDir);
    await db.patch({ babybox: { name: "prvni" } });

    await db.patch({ babybox: { name: "druhy" } });

    expect(readJson("main.json.bak")).toEqual({
      ...base(),
      babybox: { name: "prvni" },
    });
    expect(readJson("main.json")).toEqual({
      ...base(),
      babybox: { name: "druhy" },
    });
  });

  it("rejects a non-object body and writes nothing", async () => {
    const db = await mainConfig(configDir);

    const result = await db.patch("babybox");

    expect(result).toEqual({
      status: "invalid",
      errors: [{ path: "", msg: "must be an object" }],
    });
    expect(existsSync(file("main.json"))).toBe(false);
  });

  it("rejects an empty body and writes nothing", async () => {
    const db = await mainConfig(configDir);
    await db.patch({ babybox: { name: "Brno" } });
    const before = readFileSync(file("main.json"), "utf-8");

    const result = await db.patch({});

    expect(result).toEqual({
      status: "invalid",
      errors: [{ path: "", msg: "must not be empty" }],
    });
    expect(readFileSync(file("main.json"), "utf-8")).toBe(before);
  });

  it("rejects a value of the wrong type and writes nothing", async () => {
    const db = await mainConfig(configDir);

    const result = await db.patch({ units: { engine: { ip: 5 } } });

    expect(result).toEqual({
      status: "invalid",
      errors: [{ path: "units.engine.ip", msg: "must be a string" }],
    });
    expect(existsSync(file("main.json"))).toBe(false);
    expect(db.data()).toEqual(base());
  });

  it("rejects an integer outside its range", async () => {
    const db = await mainConfig(configDir);

    const result = await db.patch({ units: { requestDelay: 0 } });

    expect(result).toEqual({
      status: "invalid",
      errors: [{ path: "units.requestDelay", msg: "must be at least 1" }],
    });
  });

  it("rejects a value outside the enum", async () => {
    const db = await mainConfig(configDir);

    const result = await db.patch({ pc: { os: "debian" } });

    expect(result).toEqual({
      status: "invalid",
      errors: [{ path: "pc.os", msg: "must be one of: windows, ubuntu" }],
    });
  });

  it("reports one error per unknown key, with a dotted path", async () => {
    const db = await mainConfig(configDir);

    const result = await db.patch({ camera: { zoom: 2, ip2: "10.1.1.8" } });

    expect(result).toEqual({
      status: "invalid",
      errors: [
        { path: "camera.zoom", msg: "unknown key" },
        { path: "camera.ip2", msg: "unknown key" },
      ],
    });
  });

  /*
   * Nothing follows a stored configer.port or configer.url: index.ts binds them at
   * start, and the backend and the panel have the address compiled in. A stored
   * change would leave the box serving nothing after the next restart.
   */
  it("rejects a change to configer.port and writes nothing", async () => {
    const db = await mainConfig(configDir);

    const result = await db.patch({ configer: { port: 5555 } });

    expect(result).toEqual({
      status: "invalid",
      errors: [
        {
          path: "configer.port",
          msg: "must stay 5001: it changes only by editing main.json and restarting configer",
        },
      ],
    });
    expect(existsSync(file("main.json"))).toBe(false);
  });

  it("rejects a change to configer.url and writes nothing", async () => {
    const db = await mainConfig(configDir);

    const result = await db.patch({ configer: { url: "/api/v2" } });

    expect(result).toEqual({
      status: "invalid",
      errors: [
        {
          path: "configer.url",
          msg: "must stay /api/v1: it changes only by editing main.json and restarting configer",
        },
      ],
    });
    expect(existsSync(file("main.json"))).toBe(false);
  });

  /* rejectBody only looked at the top level, so a body like { camera: {} } reached
   * the write, and the write rotated the one undo copy away. */
  it("writes nothing for a body that changes nothing", async () => {
    const db = await mainConfig(configDir);
    await db.patch({ babybox: { name: "prvni" } });
    await db.patch({ babybox: { name: "druhy" } });

    const result = await db.patch({ camera: {} });

    expect(result.status).toBe("saved");
    expect(readJson("main.json.bak").babybox).toEqual({ name: "prvni" });
    expect(readJson("main.json").babybox).toEqual({ name: "druhy" });
  });

  /* The form sends every field it shows, so a save that does not touch the address
   * still carries the running values. That is not a change. */
  it("accepts a body that repeats the running configer values", async () => {
    const db = await mainConfig(configDir);

    const result = await db.patch({
      configer: { port: 5001, url: "/api/v1" },
      babybox: { name: "Brno" },
    });

    expect(result.status).toBe("saved");
    expect(readJson("main.json").babybox).toEqual({ name: "Brno" });
  });

  /*
   * Boot only warns about a stored value the schema rejects, so a box can run on
   * one. Every patch merges over it and fails until someone sends that field a
   * valid value; the error names the field, so it is recoverable over the API.
   */
  it("fails while the stored config holds a value the schema rejects", async () => {
    writeFileSync(
      file("main.json"),
      JSON.stringify({ backend: { port: "8080" } })
    );
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const db = await mainConfig(configDir);

    const blocked = await db.patch({ babybox: { name: "Brno" } });

    expect(blocked).toEqual({
      status: "invalid",
      errors: [{ path: "backend.port", msg: "must be an integer" }],
    });

    const fixed = await db.patch({
      backend: { port: 5000 },
      babybox: { name: "Brno" },
    });

    expect(fixed.status).toBe("saved");
    expect(readJson("main.json").babybox).toEqual({ name: "Brno" });
  });

  it("keeps the old config in memory and on disk when the write fails", async () => {
    const db = await mainConfig(configDir);
    await db.patch({ babybox: { name: "prvni" } });
    vi.mocked(fsyncSync).mockImplementationOnce(() => {
      throw Object.assign(new Error("no space left on device"), {
        code: "ENOSPC",
      });
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = await db.patch({ babybox: { name: "druhy" } });

    expect(result).toEqual({
      status: "write-failed",
      msg: "cannot write main.json: no space left on device",
    });
    expect(db.data().babybox.name).toBe("prvni");
    expect(readJson("main.json")).toEqual({
      ...base(),
      babybox: { name: "prvni" },
    });
  });
});

/*
 * base.json is the file configer merges a stored config over, and defaultConfig is
 * the same values for everyone who has no file to read. They must not drift apart.
 * The rules themselves are tested in @babybox/config-schema.
 */
describe("base.json", () => {
  it("is the schema's defaults", () => {
    expect(base()).toEqual(defaultConfig());
  });

  it("is a valid config", () => {
    expect(validateMainConfig(base())).toEqual([]);
  });

  /* A PUT writes the parsed copy, so a key order change here rewrites every box's file. */
  it("keeps its key order when it is parsed", () => {
    const result = parseMainConfig(base());

    expect(result.ok && JSON.stringify(result.config)).toBe(
      JSON.stringify(base())
    );
  });
});
