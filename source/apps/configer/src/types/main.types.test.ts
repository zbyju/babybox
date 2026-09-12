import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { defaultConfig, validateMainConfig } from "./main.types";

const baseFile = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../configs/base.json"
);

function baseConfig(): unknown {
  return JSON.parse(readFileSync(baseFile, "utf-8")) as unknown;
}

/*
 * base.json is the file configer merges a stored config over, and defaultConfig is
 * the same values for everyone who has no file to read. They must not drift apart.
 * The rules themselves are tested in @babybox/config-schema.
 */
describe("base.json", () => {
  it("is the schema's defaults", () => {
    expect(baseConfig()).toEqual(defaultConfig());
  });

  it("is a valid config", () => {
    expect(validateMainConfig(baseConfig())).toEqual([]);
  });
});
