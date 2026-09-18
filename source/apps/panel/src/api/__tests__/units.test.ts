import { describe, expect, it } from "vitest";

import { parseUnitDataBody } from "../units";

describe("parseUnitDataBody", () => {
  it("splits a 60-field pipe window", () => {
    const line = Array.from({ length: 60 }, (_, i) => String(i)).join("|");
    const parsed = parseUnitDataBody({ msg: "ok", data: line });
    expect(parsed).toHaveLength(60);
    expect(parsed?.[28]).toEqual({ index: 28, value: "28" });
  });

  it("rejects a short window", () => {
    expect(parseUnitDataBody({ data: "0|1|2" })).toBeUndefined();
  });

  it("rejects a missing data string", () => {
    expect(parseUnitDataBody({ msg: "timeout" })).toBeUndefined();
  });
});
