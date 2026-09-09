import { Action, Unit } from "../../types/units.types";
import { actionToUnit, actionToUrl } from "../url";

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
