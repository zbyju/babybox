import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { versionConfig } from "./version.js";

describe("version records", () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "babybox-versions-"));
    file = join(dir, "versions.json");
  });

  afterEach(() => {
    rmSync(dir, { force: true, recursive: true });
    vi.restoreAllMocks();
  });

  it("makes an absent record optional and logs its absence", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    expect((await versionConfig(file)).data()).toBeNull();
    expect(info).toHaveBeenCalledWith("No versions.json record");
  });

  it.each(["null", "{}", "{bad", '{"backend":123}'])(
    "rejects malformed record %s",
    async (json) => {
      const warn = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined);
      writeFileSync(file, json);
      expect((await versionConfig(file)).data()).toBeNull();
      expect(warn).toHaveBeenCalledOnce();
    }
  );

  it("returns the four validated strings", async () => {
    const versions = {
      backend: "1",
      configer: "2",
      frontend: "3",
      startup: "4",
    };
    writeFileSync(file, JSON.stringify(versions));
    expect((await versionConfig(file)).data()).toEqual(versions);
  });
});
