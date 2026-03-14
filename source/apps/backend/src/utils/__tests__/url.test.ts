import { describe, it, expect, beforeAll } from "vitest";
import { Action } from "../../types/units.types.js";
import { actionToUrl } from "../url.js";
import { setConfig } from "../../state/config.js";
import type { MainConfig } from "../../types/config.types.js";

// Mock config for tests
const mockConfig: MainConfig = {
  babybox: { name: "Test Babybox" },
  backend: { url: "/api/v1", port: 3000, requestTimeout: 5000 },
  configer: { url: "/api/v1", port: 3001, requestTimeout: 5000 },
  startup: {},
  units: {
    engine: { ip: "10.1.1.5" },
    thermal: { ip: "10.1.1.6" },
    requestDelay: 2000,
    warningThreshold: 3,
    errorThreshold: 5,
    voltage: { divider: 63, multiplier: 100, addition: 0 },
  },
  camera: {
    ip: "10.1.1.7",
    username: "admin",
    password: "admin",
    updateDelay: 1000,
    cameraType: "dahua",
  },
  pc: { os: "ubuntu" },
  app: { password: "test123" },
};

describe("url.ts", () => {
  beforeAll(() => {
    setConfig(mockConfig);
  });

  describe("actionToUrl", () => {
    it("should return url for every action there is", () => {
      Object.values(Action).forEach((k) => {
        expect(typeof actionToUrl(k)).toBe("string");
      });
    });

    it("should return correct URL for OpenDoors action", () => {
      const url = actionToUrl(Action.OpenDoors);
      expect(url).toBe("http://10.1.1.5/sdscep?sys141=201");
    });

    it("should return correct URL for OpenServiceDoors action", () => {
      const url = actionToUrl(Action.OpenServiceDoors);
      expect(url).toBe("http://10.1.1.5/sdscep?sys141=202");
    });

    it("should return undefined for non-existent actions", () => {
      expect(actionToUrl(null as unknown as Action)).toBe(undefined);
      expect(actionToUrl(undefined as unknown as Action)).toBe(undefined);
    });
  });
});
