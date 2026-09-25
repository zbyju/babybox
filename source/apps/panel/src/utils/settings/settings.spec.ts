import { describe, expect, it } from "vitest";

import { readUnitSettings } from "./settings";

describe("readUnitSettings", () => {
  it("splits the engine and thermal values", () => {
    expect(
      readUnitSettings({
        msg: "Successfully fetched settings.",
        data: { engine: "1|2|3", thermal: "4|5" },
      }),
    ).toEqual({ engine: ["1", "2", "3"], thermal: ["4", "5"] });
  });

  /* SettingsForm skips the update and logs an error on undefined. */
  it.each([
    ["null", null],
    ["a string", "<html>Not Found</html>"],
    ["a body with no data", { msg: "Successfully fetched settings." }],
    ["data that is a string", { data: "1|2" }],
    ["data with no thermal", { data: { engine: "1|2" } }],
    ["an engine that is not a string", { data: { engine: 1, thermal: "4" } }],
    ["a thermal that is null", { data: { engine: "1|2", thermal: null } }],
  ])("is undefined for %s", (_, body) => {
    expect(readUnitSettings(body)).toBeUndefined();
  });
});
