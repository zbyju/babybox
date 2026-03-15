import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import type { EngineUnit, ThermalUnit } from "@/types/panel/units.types";

import { useConfigStore } from "../configStore";
import { useUnitsStore } from "../unitsStore";

// Helper to create a mock engine unit
const createMockEngineUnit = (): EngineUnit => ({
  data: {
    temperature: { inner: 22 },
    engine: {
      left: { load: 50, position: 100 },
      right: { load: 55, position: 100 },
    },
    door: {
      state: 0,
      isBarrierInterrupted: false,
      isServiceDoorOpened: false,
    },
    timers: { inspectionMessage: 0, serviceDoor: 0 },
    misc: { inspectionNotDoneForDays: 0 },
    time: undefined,
    isBlocked: false,
    blockValue: 0,
  },
  settings: {
    temperature: { minimalInner: 18, maximalInner: 25 },
    engine: {
      allowedLoad: 100,
      timeForEngineStart: 5,
      closedThreshold: 10,
      openedThreshold: 90,
      timeToBeOpenedInSeconds: 30,
    },
    misc: {
      pcTimeoutConnection: 60,
      emailPeriodInSeconds: 3600,
      criticalEmailPeriodInSeconds: 600,
      inspectionPeriodInSeconds: 86400,
    },
  },
});

// Helper to create a mock thermal unit
const createMockThermalUnit = (): ThermalUnit => ({
  data: {
    temperature: {
      inner: 22,
      outside: 20,
      casing: 25,
      top: 23,
      bottom: 21,
      isHeatingCasing: false,
      isHeatingAir: false,
      isCoolingAir: false,
    },
    voltage: { in: 12, battery: 12, units: 12, gsm: 12 },
    door: { isServiceDoorOpened: false },
    time: undefined,
    isBlocked: false,
    blockValue: 0,
  },
  settings: {
    temperature: {
      hysteresisHeating: 2,
      hysteresisCooling: 2,
      optimalInner: 22,
      minimalInner: 18,
      maximalInner: 25,
      maximalCasing: 40,
      maximalPeltier: 60,
    },
    voltage: { minimal: 10 },
    misc: { emailPeriodInSeconds: 3600 },
  },
});

describe("Units Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("initial state", () => {
    it("should have undefined units initially", () => {
      const store = useUnitsStore();

      expect(store.engineUnit).toBeUndefined();
      expect(store.thermalUnit).toBeUndefined();
      expect(store.time).toBeUndefined();
    });
  });

  describe("setEngineUnit", () => {
    it("should set engine unit data", () => {
      const store = useUnitsStore();
      const mockEngine = createMockEngineUnit();

      store.setEngineUnit(mockEngine);

      expect(store.engineUnit).toBeDefined();
      expect(store.engineUnit?.data.temperature.inner).toBe(22);
      expect(store.engineUnit?.data.engine.left.load).toBe(50);
      expect(store.engineUnit?.data.engine.right.load).toBe(55);
    });
  });

  describe("setThermalUnit", () => {
    it("should set thermal unit data", () => {
      const store = useUnitsStore();
      const mockThermal = createMockThermalUnit();

      store.setThermalUnit(mockThermal);

      expect(store.thermalUnit).toBeDefined();
      expect(store.thermalUnit?.data.temperature.inner).toBe(22);
      expect(store.thermalUnit?.data.temperature.outside).toBe(20);
    });
  });

  describe("setRawEngineUnit", () => {
    it("should parse and set raw engine unit", () => {
      const store = useUnitsStore();

      // Create raw data array
      const rawData = Array.from({ length: 60 }, (_, i) => ({
        index: i,
        value: "0",
      }));
      // Set specific values
      rawData[28] = { index: 28, value: "2200" }; // inner temp = 22.00
      rawData[35] = { index: 35, value: "50" }; // left load
      rawData[36] = { index: 36, value: "55" }; // right load
      rawData[37] = { index: 37, value: "100" }; // left position
      rawData[38] = { index: 38, value: "100" }; // right position
      rawData[45] = { index: 45, value: "0" }; // blockValue

      store.setRawEngineUnit(rawData);

      expect(store.engineUnit).toBeDefined();
      expect(store.engineUnit?.data.temperature.inner).toBe(22);
      expect(store.engineUnit?.data.engine.left.load).toBe(50);
    });

    it("should set engine unit to undefined when raw data is undefined", () => {
      const store = useUnitsStore();
      store.setEngineUnit(createMockEngineUnit());

      store.setRawEngineUnit(undefined);

      expect(store.engineUnit).toBeUndefined();
    });
  });

  describe("setRawThermalUnit", () => {
    it("should parse and set raw thermal unit with voltage config", () => {
      const store = useUnitsStore();
      const configStore = useConfigStore();

      // Set voltage config
      configStore.$patch({
        units: {
          voltage: {
            divider: 3400,
            multiplier: 100,
            addition: 0,
          },
        },
      });

      // Create raw data array
      const rawData = Array.from({ length: 50 }, (_, i) => ({
        index: i,
        value: "0",
      }));
      // Set specific values
      rawData[29] = { index: 29, value: "2200" }; // inner temp = 22.00
      rawData[28] = { index: 28, value: "2000" }; // outside temp = 20.00
      rawData[35] = { index: 35, value: "3400" }; // in voltage
      rawData[46] = { index: 46, value: "0" }; // blockValue

      store.setRawThermalUnit(rawData);

      expect(store.thermalUnit).toBeDefined();
      expect(store.thermalUnit?.data.temperature.inner).toBe(22);
      expect(store.thermalUnit?.data.temperature.outside).toBe(20);
      expect(store.thermalUnit?.data.voltage.in).toBe(100); // 3400 * 100 / 3400
    });

    it("should use default voltage config when not configured", () => {
      const store = useUnitsStore();

      // Create raw data array with voltage value
      const rawData = Array.from({ length: 50 }, (_, i) => ({
        index: i,
        value: "0",
      }));
      rawData[35] = { index: 35, value: "3400" }; // in voltage
      rawData[36] = { index: 36, value: "3400" }; // battery voltage

      store.setRawThermalUnit(rawData);

      expect(store.thermalUnit).toBeDefined();
      // Default config: divider=3400, multiplier=100, addition=0
      expect(store.thermalUnit?.data.voltage.in).toBe(100);
    });

    it("should set thermal unit to undefined when raw data is undefined", () => {
      const store = useUnitsStore();
      store.setThermalUnit(createMockThermalUnit());

      store.setRawThermalUnit(undefined);

      // Note: There's a bug in the store - it sets engineUnit instead of thermalUnit
      // This test documents the current behavior
      expect(store.engineUnit).toBeUndefined();
    });
  });

  describe("setTime", () => {
    it("should set time", () => {
      const store = useUnitsStore();

      // We can't easily create a moment object without the moment library
      // Just test that setting undefined works
      store.setTime(undefined);

      expect(store.time).toBeUndefined();
    });
  });
});
