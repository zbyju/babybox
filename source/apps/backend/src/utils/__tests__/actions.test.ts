import { Action } from "../../types/units.types";
import { stringToAction } from "../actions";

describe("actions.ts", () => {
  describe("stringToAction", () => {
    it("should return action for existing actions", () => {
      expect(stringToAction("opendoors")).toBe(Action.OpenDoors);
      expect(stringToAction("openservicedoors")).toBe(Action.OpenServiceDoors);
    });

    it("should return action for different capitalization", () => {
      expect(stringToAction("OpenDoors")).toBe(Action.OpenDoors);
      expect(stringToAction("OpEnDoOrS")).toBe(Action.OpenDoors);
      expect(stringToAction("OPENDOORS")).toBe(Action.OpenDoors);
      expect(stringToAction("oPENdOORS")).toBe(Action.OpenDoors);
      expect(stringToAction("OpenServiceDoors")).toBe(Action.OpenServiceDoors);
      expect(stringToAction("OpenServiceDOORS")).toBe(Action.OpenServiceDoors);
      expect(stringToAction("OPENSERVICEDOORS")).toBe(Action.OpenServiceDoors);
    });

    it("should return undefined for a non-existent action", () => {
      expect(stringToAction("wrong")).toBe(undefined);
      expect(stringToAction("non-existent")).toBe(undefined);
    });

    it("should return undefined for misspelled actions", () => {
      expect(stringToAction("open doors")).toBe(undefined);
      expect(stringToAction("open-doors")).toBe(undefined);
      expect(stringToAction("opendors")).toBe(undefined);
    });

    it("should return undefined for null cases", () => {
      expect(stringToAction(null)).toBe(undefined);
      expect(stringToAction(undefined)).toBe(undefined);
      expect(stringToAction("")).toBe(undefined);
    });
  });
});
