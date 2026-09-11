import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mainConfig } from "./main";

const repoBase = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../configs/base.json"
);

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
  it("fills a partial body from base.json", async () => {
    const db = await mainConfig(configDir);

    const result = await db.update({ babybox: { name: "Brno" } });

    expect(result.ok).toBe(true);
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
      ok: false,
      errors: [{ path: "units.engine.ip", msg: "must be a string" }],
    });
    expect(readFileSync(file("main.json"), "utf-8")).toBe(before);
    expect(db.data()).toEqual(base());
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

  it("leaves no temp file behind", async () => {
    const db = await mainConfig(configDir);

    await db.update({ babybox: { name: "Brno" } });

    expect(existsSync(file("main.json.tmp"))).toBe(false);
  });
});
