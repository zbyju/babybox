import { describe, it, expect } from "vitest";

import {
  isInstanceOfMainConfig,
  isInstanceOfMainConfigApp,
  isInstanceOfMainConfigBabybox,
  isInstanceOfMainConfigBackend,
  isInstanceOfMainConfigCamera,
  isInstanceOfMainConfigConfiger,
  isInstanceOfMainConfigPc,
  isInstanceOfMainConfigUnit,
  isInstanceOfMainConfigUnits,
  isInstanceOfMainConfigVoltage,
} from "../main.types.js";

// Valid config objects for testing
const validVoltage = {
  divider: 3400,
  multiplier: 100,
  addition: 0,
};

const validUnits = {
  requestDelay: 2000,
  warningThreshold: 5,
  errorThreshold: 25,
  voltage: validVoltage,
};

const validBackend = {
  url: "http://localhost",
  port: 3000,
  requestTimeout: 5000,
};

const validConfiger = {
  url: "http://localhost",
  port: 3001,
  requestTimeout: 5000,
};

const validBabybox = {
  name: "Test Babybox",
};

const validCamera = {
  ip: "10.1.1.7",
  username: "admin",
  password: "password",
  updateDelay: 1000,
  cameraType: "dahua",
};

const validPc = {
  os: "ubuntu" as const,
};

const validApp = {
  password: "secret",
};

const validMainConfig = {
  babybox: validBabybox,
  backend: validBackend,
  configer: validConfiger,
  startup: {},
  units: validUnits,
  camera: validCamera,
  pc: validPc,
  app: validApp,
};

describe("Config Type Guards", () => {
  describe("isInstanceOfMainConfigVoltage", () => {
    it("should return true for valid voltage config", () => {
      expect(isInstanceOfMainConfigVoltage(validVoltage)).toBe(true);
    });

    it("should return false for null", () => {
      expect(isInstanceOfMainConfigVoltage(null)).toBe(false);
    });

    it("should return false for missing fields", () => {
      expect(isInstanceOfMainConfigVoltage({ divider: 3400 })).toBe(false);
    });

    it("should return false for non-integer values", () => {
      expect(
        isInstanceOfMainConfigVoltage({
          divider: 3400.5,
          multiplier: 100,
          addition: 0,
        })
      ).toBe(false);
    });
  });

  describe("isInstanceOfMainConfigUnits", () => {
    it("should return true for valid units config", () => {
      expect(isInstanceOfMainConfigUnits(validUnits)).toBe(true);
    });

    it("should return false for missing voltage", () => {
      expect(
        isInstanceOfMainConfigUnits({
          requestDelay: 2000,
          warningThreshold: 5,
          errorThreshold: 25,
        })
      ).toBe(false);
    });

    it("should return false for invalid voltage", () => {
      expect(
        isInstanceOfMainConfigUnits({
          requestDelay: 2000,
          warningThreshold: 5,
          errorThreshold: 25,
          voltage: { divider: "invalid" },
        })
      ).toBe(false);
    });
  });

  describe("isInstanceOfMainConfigBackend", () => {
    it("should return true for valid backend config", () => {
      expect(isInstanceOfMainConfigBackend(validBackend)).toBe(true);
    });

    it("should return false for non-string url", () => {
      expect(
        isInstanceOfMainConfigBackend({
          url: 123,
          port: 3000,
          requestTimeout: 5000,
        })
      ).toBe(false);
    });

    it("should return false for non-integer port", () => {
      expect(
        isInstanceOfMainConfigBackend({
          url: "http://localhost",
          port: "3000",
          requestTimeout: 5000,
        })
      ).toBe(false);
    });
  });

  describe("isInstanceOfMainConfigConfiger", () => {
    it("should return true for valid configer config", () => {
      expect(isInstanceOfMainConfigConfiger(validConfiger)).toBe(true);
    });

    it("should return false for missing fields", () => {
      expect(isInstanceOfMainConfigConfiger({ url: "http://localhost" })).toBe(
        false
      );
    });
  });

  describe("isInstanceOfMainConfigBabybox", () => {
    it("should return true for valid babybox config", () => {
      expect(isInstanceOfMainConfigBabybox(validBabybox)).toBe(true);
    });

    it("should return false for non-string name", () => {
      expect(isInstanceOfMainConfigBabybox({ name: 123 })).toBe(false);
    });
  });

  describe("isInstanceOfMainConfigCamera", () => {
    it("should return true for valid camera config", () => {
      expect(isInstanceOfMainConfigCamera(validCamera)).toBe(true);
    });

    it("should return false for invalid camera type", () => {
      expect(
        isInstanceOfMainConfigCamera({
          ...validCamera,
          cameraType: "invalid",
        })
      ).toBe(false);
    });

    it("should accept all valid camera types", () => {
      expect(
        isInstanceOfMainConfigCamera({ ...validCamera, cameraType: "dahua" })
      ).toBe(true);
      expect(
        isInstanceOfMainConfigCamera({ ...validCamera, cameraType: "avtech" })
      ).toBe(true);
      expect(
        isInstanceOfMainConfigCamera({ ...validCamera, cameraType: "vivotek" })
      ).toBe(true);
    });
  });

  describe("isInstanceOfMainConfigPc", () => {
    it("should return true for valid pc config", () => {
      expect(isInstanceOfMainConfigPc(validPc)).toBe(true);
    });

    it("should accept ubuntu and windows", () => {
      expect(isInstanceOfMainConfigPc({ os: "ubuntu" })).toBe(true);
      expect(isInstanceOfMainConfigPc({ os: "windows" })).toBe(true);
    });

    it("should return false for invalid os", () => {
      expect(isInstanceOfMainConfigPc({ os: "macos" })).toBe(false);
    });
  });

  describe("isInstanceOfMainConfigApp", () => {
    it("should return true for valid app config", () => {
      expect(isInstanceOfMainConfigApp(validApp)).toBe(true);
    });

    it("should accept optional refreshRequestLimit", () => {
      expect(
        isInstanceOfMainConfigApp({ password: "secret", refreshRequestLimit: 5 })
      ).toBe(true);
    });

    it("should return false for missing password", () => {
      expect(isInstanceOfMainConfigApp({})).toBe(false);
    });
  });

  describe("isInstanceOfMainConfigUnit", () => {
    it("should return true for valid unit config", () => {
      expect(isInstanceOfMainConfigUnit({ ip: "10.1.1.5" })).toBe(true);
    });

    it("should return false for non-string ip", () => {
      expect(isInstanceOfMainConfigUnit({ ip: 123 })).toBe(false);
    });
  });

  describe("isInstanceOfMainConfig", () => {
    it("should return true for valid main config", () => {
      expect(isInstanceOfMainConfig(validMainConfig)).toBe(true);
    });

    it("should return false for null", () => {
      expect(isInstanceOfMainConfig(null)).toBe(false);
    });

    it("should return false for missing sections", () => {
      const { babybox, ...rest } = validMainConfig;
      expect(isInstanceOfMainConfig(rest)).toBe(false);
    });

    it("should return false for invalid nested config", () => {
      expect(
        isInstanceOfMainConfig({
          ...validMainConfig,
          backend: { url: "http://localhost" }, // missing port and requestTimeout
        })
      ).toBe(false);
    });

    it("should return false for invalid camera type in nested config", () => {
      expect(
        isInstanceOfMainConfig({
          ...validMainConfig,
          camera: { ...validCamera, cameraType: "invalid" },
        })
      ).toBe(false);
    });
  });
});
