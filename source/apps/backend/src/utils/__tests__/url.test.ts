import { describe, expect, it, vi } from "vitest";

/*
 * url.ts reads `config` from src/index.ts, which is null until the backend has
 * fetched it from configer. Without this the whole suite throws on import.
 */
vi.mock("../../index.js", () => ({
  config: {
    units: { engine: { ip: "10.1.1.5" }, thermal: { ip: "10.1.1.6" } },
  },
}));

import { Action, Unit } from "../../types/units.types.js";
import { actionToUnit, actionToUrl } from "../url.js";

describe("url.ts", () => {
  describe("actionToUrl", () => {
    it("should return url for every action there is", () => {
      Object.values(Action).forEach((k) => {
        expect(typeof actionToUrl(k)).toBe("string");
      });
    });

    it("should return undefined for non-existent actions", () => {
      expect(actionToUrl(null)).toBe(undefined);
      expect(actionToUrl(undefined)).toBe(undefined);
    });

    it("should return undefined for inherited object keys", () => {
      expect(actionToUrl("toString" as unknown as Action)).toBe(undefined);
      expect(actionToUrl("constructor" as unknown as Action)).toBe(undefined);
    });

    it("should build the url from the unit ip and the action path", () => {
      expect(actionToUrl(Action.OpenDoors)).toBe(
        "http://10.1.1.5/sdscep?sys141=201"
      );
      expect(actionToUrl(Action.OpenServiceDoors)).toBe(
        "http://10.1.1.5/sdscep?sys141=202"
      );
    });
  });

  describe("actionToUnit", () => {
    it("should return a unit for every action there is", () => {
      Object.values(Action).forEach((k) => {
        expect(Object.values(Unit)).toContain(actionToUnit(k));
      });
    });

    it("should return undefined for non-existent actions", () => {
      expect(actionToUnit(null)).toBe(undefined);
      expect(actionToUnit(undefined)).toBe(undefined);
    });
  });
});
