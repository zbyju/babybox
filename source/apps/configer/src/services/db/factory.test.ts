import { describe, expect, it } from "vitest";

import { DbFactory } from "./factory.js";

describe("DbFactory", () => {
  it("names the static methods that exist", () => {
    let message = "";
    try {
      new DbFactory();
    } catch (err) {
      message = err instanceof Error ? err.message : "";
    }

    expect(message).toContain("DbFactory.getMainDb");
    expect(message).toContain("DbFactory.getVersionDb");
    expect(message).not.toContain("getInstance");
  });
});
