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

function base(): Record<string, unknown> {
  return JSON.parse(readFileSync(repoBase, "utf-8")) as Record<string, unknown>;
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
  it("writes main.json from base.json when there is none", async () => {
    const db = await mainConfig(configDir);

    expect(db.data()).toEqual(base());
    expect(readJson("main.json")).toEqual(base());
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

  it("keeps a good main.json.bak when main.json is corrupt", async () => {
    const backup = { babybox: { name: "ze zalohy" } };
    writeFileSync(file("main.json.bak"), JSON.stringify(backup));
    writeFileSync(file("main.json"), "{ not json");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await mainConfig(configDir);

    expect(readJson("main.json.bak")).toEqual(backup);
  });

  it("treats a main.json that is not an object as corrupt", async () => {
    const backup = { babybox: { name: "ze zalohy" } };
    writeFileSync(file("main.json.bak"), JSON.stringify(backup));
    writeFileSync(file("main.json"), '"abc"');
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const db = await mainConfig(configDir);

    expect(db.data().babybox.name).toBe("ze zalohy");
    expect(readFileSync(file("main.json.corrupt"), "utf-8")).toBe('"abc"');
    expect(readJson("main.json.bak")).toEqual(backup);
  });

  it("falls back without a .corrupt copy when main.json cannot be read", async () => {
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
    expect(existsSync(file("main.json.corrupt"))).toBe(false);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("EACCES"));
  });

  it("keeps the unreadable main.json as main.json.corrupt", async () => {
    writeFileSync(file("main.json"), "{ not json");
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await mainConfig(configDir);

    expect(readFileSync(file("main.json.corrupt"), "utf-8")).toBe("{ not json");
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
    const before = readFileSync(file("main.json"), "utf-8");

    const result = await db.update({ units: { engine: { ip: 5 } } });

    expect(result).toEqual({
      status: "invalid",
      errors: [{ path: "units.engine.ip", msg: "must be a string" }],
    });
    expect(readFileSync(file("main.json"), "utf-8")).toBe(before);
    expect(db.data()).toEqual(base());
  });

  it("rejects a non-object body and writes nothing", async () => {
    const db = await mainConfig(configDir);
    const before = readFileSync(file("main.json"), "utf-8");

    const result = await db.update([]);

    expect(result).toEqual({
      status: "invalid",
      errors: [{ path: "", msg: "must be an object" }],
    });
    expect(readFileSync(file("main.json"), "utf-8")).toBe(before);
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

  it("leaves no temp file behind", async () => {
    const db = await mainConfig(configDir);

    await db.update({ babybox: { name: "Brno" } });

    expect(existsSync(file("main.json.tmp"))).toBe(false);
  });
});
