import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { ConnectionTracker } from "@/pinia/connection-store";
import type { Connection } from "@/types/panel/connection.types";
import { TableBlockState, TableRowState, TableValuesState } from "@/types/panel/tables.types";
import type { EngineUnit, ThermalUnit } from "@/types/panel/units.types";

import {
  getTableConnectionValues,
  getTableDoorsValues,
  getTableTemperaturesValues,
  getTableVoltageValues,
} from "../tables";

const createMockEngineUnit = (): EngineUnit => ({
  data: {
    temperature: { inner: 22 },
    engine: {
      left: { load: 50, position: 100 },
      right: { load: 60, position: 90 },
    },
    door: {
      state: 0,
      isBarrierInterrupted: false,
      isServiceDoorOpened: false,
    },
    timers: { inspectionMessage: 3600, serviceDoor: 0 },
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

const createMockThermalUnit = (voltageIn = 12): ThermalUnit => ({
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
    voltage: { in: voltageIn, battery: 12, units: 12, gsm: 12 },
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

const createMockConnection = (): Connection => ({
  engineUnit: new ConnectionTracker(),
  thermalUnit: new ConnectionTracker(),
});

const mockConfig = {
  babybox: { name: "Test" },
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
    cameraType: "dahua" as const,
  },
  pc: { os: "ubuntu" as const },
  app: { password: "test" },
};

describe("tables.ts", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("getTableDoorsValues", () => {
    it("should return error state when engine data is undefined", () => {
      const result = getTableDoorsValues(undefined);
      expect(result.state).toBe(TableValuesState.Error);
    });

    it("should return Ok state with engine data", () => {
      const engine = createMockEngineUnit();
      const result = getTableDoorsValues(engine);

      expect(result.state).toBe(TableValuesState.Ok);
      expect(result.rowValues).toBeDefined();
    });

    it("should show blocked state when engine is blocked", () => {
      const engine = createMockEngineUnit();
      engine.data.isBlocked = true;
      const result = getTableDoorsValues(engine);

      expect(result.state).toBe(TableValuesState.Ok);
      expect(result.blockValues?.isBlocked.state).toBe(TableBlockState.ColorError);
    });

    it("should show inactive block state when engine is not blocked", () => {
      const engine = createMockEngineUnit();
      engine.data.isBlocked = false;
      const result = getTableDoorsValues(engine);

      expect(result.blockValues?.isBlocked.state).toBe(TableBlockState.Inactive);
    });
  });

  describe("getTableTemperaturesValues", () => {
    it("should return error state when thermal data is undefined", () => {
      const result = getTableTemperaturesValues(undefined);
      expect(result.state).toBe(TableValuesState.Error);
    });

    it("should return Ok state with thermal data", () => {
      const thermal = createMockThermalUnit();
      const result = getTableTemperaturesValues(thermal);

      expect(result.state).toBe(TableValuesState.Ok);
      expect(result.rowValues).toBeDefined();
    });

    it("should include all temperature fields", () => {
      const thermal = createMockThermalUnit();
      const result = getTableTemperaturesValues(thermal);

      expect(result.rowValues?.innerTemperature).toBeDefined();
      expect(result.rowValues?.outsideTemperature).toBeDefined();
      expect(result.rowValues?.casingTemperature).toBeDefined();
    });

    it("should show heating casing block state", () => {
      const thermal = createMockThermalUnit();
      thermal.data.temperature.isHeatingCasing = true;
      const result = getTableTemperaturesValues(thermal);

      expect(result.blockValues?.isHeatingCasing.state).toBe(TableBlockState.ColorSuccess);
    });
  });

  describe("getTableVoltageValues", () => {
    it("should return error state when thermal data is undefined", () => {
      const result = getTableVoltageValues(undefined);
      expect(result.state).toBe(TableValuesState.Error);
    });

    it("should return Ok state with thermal data", () => {
      const thermal = createMockThermalUnit();
      const result = getTableVoltageValues(thermal);

      expect(result.state).toBe(TableValuesState.Ok);
      expect(result.rowValues).toBeDefined();
    });

    it("should mark voltage as error when below minimal", () => {
      const thermal = createMockThermalUnit(5); // 5V is below minimal of 10V
      const result = getTableVoltageValues(thermal);

      expect(result.rowValues?.inVoltage.state).toBe(TableRowState.ColorError);
    });

    it("should mark voltage as Ok when above minimal", () => {
      const thermal = createMockThermalUnit(12); // 12V is above minimal of 10V
      const result = getTableVoltageValues(thermal);

      expect(result.rowValues?.inVoltage.state).toBe(TableRowState.Ok);
    });

    it("should include goal voltage info", () => {
      const thermal = createMockThermalUnit();
      const result = getTableVoltageValues(thermal);

      expect(result.rowValues?.inGoalVoltage.value).toBeDefined();
      expect(result.rowValues?.batteryGoalVoltage.value).toBeDefined();
    });
  });

  describe("getTableConnectionValues", () => {
    it("should return Ok state", () => {
      const engine = createMockEngineUnit();
      const connection = createMockConnection();
      const result = getTableConnectionValues(engine, connection, mockConfig);

      expect(result.state).toBe(TableValuesState.Ok);
    });

    it("should include all connection fields", () => {
      const engine = createMockEngineUnit();
      const connection = createMockConnection();
      const result = getTableConnectionValues(engine, connection, mockConfig);

      expect(result.rowValues?.requests).toBeDefined();
      expect(result.rowValues?.successfulRequests).toBeDefined();
      expect(result.rowValues?.failedRequests).toBeDefined();
      expect(result.rowValues?.quality).toBeDefined();
      expect(result.rowValues?.timeout).toBeDefined();
    });

    it("should show timeout from config", () => {
      const engine = createMockEngineUnit();
      const connection = createMockConnection();
      const result = getTableConnectionValues(engine, connection, mockConfig);

      expect(result.rowValues?.timeout.value).toBe("5000ms");
    });
  });
});
