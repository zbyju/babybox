import { Action } from "../../types/units.types";
import { actionToUrl } from "../url";

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
});
