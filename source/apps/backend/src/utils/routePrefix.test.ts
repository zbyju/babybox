import { describe, expect, it } from "vitest";

import { safeRoutePrefix } from "./routePrefix.js";

describe("safeRoutePrefix", () => {
  it("keeps the default prefix", () => {
    expect(safeRoutePrefix("/api/v1")).toBe("/api/v1");
  });

  it("keeps an empty prefix", () => {
    expect(safeRoutePrefix("")).toBe("");
  });

  it("keeps a prefix with a named parameter", () => {
    expect(safeRoutePrefix("/api/:version")).toBe("/api/:version");
  });

  /*
   * Every character here makes path-to-regexp 8 throw when the route is
   * registered, which would stop the backend from listening at all.
   */
  it.each(["?", "+", "(", ")", "[", "]", "{", "}", "!"])(
    "drops a prefix holding %s",
    (char) => {
      expect(safeRoutePrefix(`/api/v1${char}`)).toBe("");
    }
  );

  it("drops a colon with no name after it", () => {
    expect(safeRoutePrefix("/api:")).toBe("");
  });

  it("drops a star with no name after it", () => {
    expect(safeRoutePrefix("/api*")).toBe("");
  });
});
