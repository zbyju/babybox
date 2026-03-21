import { describe, it, expect } from "vitest";

import type { RawEngineUnit, RawThermalUnit } from "@/types/panel/units.types";

import {
  rawEngineUnitToEngineUnit,
  rawThermalUnitToThermalUnit,
} from "../units.defaults";

// Helper to create a raw unit array with default values
// The array must be indexed properly (rawEngineUnit[35].value accesses element at index 35)
const createRawEngineUnit = (
  overrides: Partial<Record<number, string>> = {}
): RawEngineUnit => {
  const defaults: Record<number, string> = {
    0: "100", // allowedLoad
    1: "5", // timeForEngineStart
    2: "10", // closedThreshold
    3: "90", // openedThreshold
    4: "30", // timeToBeOpenedInSeconds
    5: "60", // pcTimeoutConnection
    6: "1800", // minimalInner (18.00)
    7: "2500", // maximalInner (25.00)
    9: "3600", // emailPeriodInSeconds
    10: "600", // criticalEmailPeriodInSeconds
    11: "86400", // inspectionPeriodInSeconds
    17: "0", // isBarrierInterrupted
    23: "0", // isServiceDoorOpened
    28: "2200", // inner temperature (22.00)
    33: "0", // inspectionNotDoneForDays
    35: "50", // left motor load
    36: "55", // right motor load
    37: "100", // left motor position
    38: "100", // right motor position
    39: "15", // day
    40: "03", // month
    41: "2026", // year (full 4-digit year)
    42: "10", // hour
    43: "30", // minute
    44: "45", // second
    45: "0", // blockValue / isBlocked
    48: "0", // door state
    58: "0", // serviceDoor timer
    59: "0", // inspectionMessage timer
  };

  const merged = { ...defaults, ...overrides };
  // Create array with 60 elements, all initialized
  const result: RawEngineUnit = Array.from({ length: 60 }, (_, i) => ({
    index: i,
    value: merged[i] ?? "0",
  }));
  return result;
};

const createRawThermalUnit = (
  overrides: Partial<Record<number, string>> = {}
): RawThermalUnit => {
  const defaults: Record<number, string> = {
    0: "2200", // optimalInner (22.00)
    1: "200", // hysteresisHeating (2.00)
    2: "200", // hysteresisCooling (2.00)
    3: "1800", // minimalInner (18.00)
    4: "2500", // maximalInner (25.00)
    5: "4000", // maximalCasing (40.00)
    6: "3400", // minimal voltage
    7: "6000", // maximalPeltier (60.00)
    8: "3600", // emailPeriodInSeconds
    23: "0", // isServiceDoorOpened
    24: "0", // isHeatingCasing
    25: "0", // isHeatingAir
    26: "0", // isCoolingAir
    28: "2000", // outside temperature (20.00)
    29: "2200", // inner temperature (22.00)
    30: "2500", // casing temperature (25.00)
    31: "2100", // bottom temperature (21.00)
    32: "2300", // top temperature (23.00)
    35: "3400", // in voltage
    36: "3400", // battery voltage
    37: "3400", // units voltage
    38: "3400", // gsm voltage
    39: "15", // day
    40: "03", // month
    41: "2026", // year (full 4-digit year)
    42: "10", // hour
    43: "30", // minute
    44: "45", // second
    46: "0", // blockValue / isBlocked
  };

  const merged = { ...defaults, ...overrides };
  // Create array with 50 elements, all initialized
  const result: RawThermalUnit = Array.from({ length: 50 }, (_, i) => ({
    index: i,
    value: merged[i] ?? "0",
  }));
  return result;
};

const defaultVoltageConfig = {
  divider: 3400,
  multiplier: 100,
  addition: 0,
};

describe("units.defaults", () => {
  describe("rawEngineUnitToEngineUnit", () => {
    it("should parse valid engine data", () => {
      const raw = createRawEngineUnit();
      const result = rawEngineUnitToEngineUnit(raw);

      expect(result.data.temperature.inner).toBe(22);
      expect(result.data.engine.left.load).toBe(50);
      expect(result.data.engine.right.load).toBe(55);
      expect(result.data.engine.left.position).toBe(100);
      expect(result.data.engine.right.position).toBe(100);
      expect(result.data.door.state).toBe(0);
      expect(result.data.door.isBarrierInterrupted).toBe(false);
      expect(result.data.door.isServiceDoorOpened).toBe(false);
      expect(result.data.blockValue).toBe(0);
      expect(result.data.isBlocked).toBe(false);
    });

    it("should parse settings correctly", () => {
      const raw = createRawEngineUnit();
      const result = rawEngineUnitToEngineUnit(raw);

      expect(result.settings.temperature.minimalInner).toBe(18);
      expect(result.settings.temperature.maximalInner).toBe(25);
      expect(result.settings.engine.allowedLoad).toBe(100);
      expect(result.settings.engine.timeForEngineStart).toBe(5);
      expect(result.settings.misc.pcTimeoutConnection).toBe(60);
    });

    it("should parse time correctly", () => {
      const raw = createRawEngineUnit();
      const result = rawEngineUnitToEngineUnit(raw);

      expect(result.data.time).toBeDefined();
      expect(result.data.time?.isValid()).toBe(true);
      expect(result.data.time?.date()).toBe(15);
      expect(result.data.time?.month()).toBe(2); // 0-indexed (March = 2)
      expect(result.data.time?.year()).toBe(2026);
    });

    it("should detect activation state from blockValue", () => {
      const raw = createRawEngineUnit({ 45: "1" }); // blockValue = 1 means activated
      const result = rawEngineUnitToEngineUnit(raw);

      expect(result.data.blockValue).toBe(1);
      expect(result.data.isBlocked).toBe(true);
    });

    it("should detect barrier interruption", () => {
      const raw = createRawEngineUnit({ 17: "1" });
      const result = rawEngineUnitToEngineUnit(raw);

      expect(result.data.door.isBarrierInterrupted).toBe(true);
    });

    it("should handle inspection days not done", () => {
      const raw = createRawEngineUnit({ 33: "5" });
      const result = rawEngineUnitToEngineUnit(raw);

      expect(result.data.misc.inspectionNotDoneForDays).toBe(5);
    });
  });

  describe("rawThermalUnitToThermalUnit", () => {
    it("should parse valid thermal data", () => {
      const raw = createRawThermalUnit();
      const result = rawThermalUnitToThermalUnit(raw, defaultVoltageConfig);

      expect(result.data.temperature.inner).toBe(22);
      expect(result.data.temperature.outside).toBe(20);
      expect(result.data.temperature.casing).toBe(25);
      expect(result.data.temperature.top).toBe(23);
      expect(result.data.temperature.bottom).toBe(21);
      expect(result.data.temperature.isHeatingCasing).toBe(false);
      expect(result.data.temperature.isHeatingAir).toBe(false);
      expect(result.data.temperature.isCoolingAir).toBe(false);
    });

    it("should parse voltage data with config", () => {
      const raw = createRawThermalUnit();
      const result = rawThermalUnitToThermalUnit(raw, defaultVoltageConfig);

      // 3400 * 100 / 3400 + 0 = 100
      expect(result.data.voltage.in).toBe(100);
      expect(result.data.voltage.battery).toBe(100);
      expect(result.data.voltage.units).toBe(100);
      expect(result.data.voltage.gsm).toBe(100);
    });

    it("should parse settings correctly", () => {
      const raw = createRawThermalUnit();
      const result = rawThermalUnitToThermalUnit(raw, defaultVoltageConfig);

      expect(result.settings.temperature.optimalInner).toBe(22);
      expect(result.settings.temperature.hysteresisHeating).toBe(2);
      expect(result.settings.temperature.hysteresisCooling).toBe(2);
      expect(result.settings.temperature.minimalInner).toBe(18);
      expect(result.settings.temperature.maximalInner).toBe(25);
      expect(result.settings.temperature.maximalCasing).toBe(40);
    });

    it("should detect heating/cooling states", () => {
      const raw = createRawThermalUnit({
        24: "1", // isHeatingCasing
        25: "1", // isHeatingAir
        26: "1", // isCoolingAir
      });
      const result = rawThermalUnitToThermalUnit(raw, defaultVoltageConfig);

      expect(result.data.temperature.isHeatingCasing).toBe(true);
      expect(result.data.temperature.isHeatingAir).toBe(true);
      expect(result.data.temperature.isCoolingAir).toBe(true);
    });

    it("should parse time correctly", () => {
      const raw = createRawThermalUnit();
      const result = rawThermalUnitToThermalUnit(raw, defaultVoltageConfig);

      expect(result.data.time).toBeDefined();
      expect(result.data.time?.isValid()).toBe(true);
    });

    it("should detect block states", () => {
      const raw = createRawThermalUnit({ 46: "4" }); // blockValue = 4 (fault in babybox)
      const result = rawThermalUnitToThermalUnit(raw, defaultVoltageConfig);

      expect(result.data.blockValue).toBe(4);
      expect(result.data.isBlocked).toBe(true);
    });
  });
});
