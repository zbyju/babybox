import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";

import { useConfigStore } from "@/pinia/configStore";
import { ConnectionTracker } from "@/pinia/connectionStore";
import type { Connection } from "@/types/panel/connection.types";
import type { EngineUnit, ThermalUnit } from "@/types/panel/units.types";

import { getNewState } from "../state";

// Helper to create a mock engine unit
const createMockEngineUnit = (
  overrides: Partial<{
    blockValue: number;
    doorState: number;
    inspectionNotDoneForDays: number;
  }> = {}
): EngineUnit => ({
  data: {
    temperature: { inner: 22 },
    engine: {
      left: { load: 50, position: 100 },
      right: { load: 50, position: 100 },
    },
    door: {
      state: overrides.doorState ?? 0,
      isBarrierInterrupted: false,
      isServiceDoorOpened: false,
    },
    timers: { inspectionMessage: 0, serviceDoor: 0 },
    misc: { inspectionNotDoneForDays: overrides.inspectionNotDoneForDays ?? 0 },
    time: undefined,
    isBlocked: (overrides.blockValue ?? 0) !== 0,
    blockValue: overrides.blockValue ?? 0,
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
const createMockThermalUnit = (
  overrides: Partial<{ blockValue: number }> = {}
): ThermalUnit => ({
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
    isBlocked: (overrides.blockValue ?? 0) !== 0,
    blockValue: overrides.blockValue ?? 0,
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

// Helper to create a mock connection
const createMockConnection = (
  engineFailStreak = 0,
  thermalFailStreak = 0
): Connection => {
  const engineTracker = new ConnectionTracker();
  const thermalTracker = new ConnectionTracker();

  // Set fail streaks
  for (let i = 0; i < engineFailStreak; i++) {
    engineTracker.failStreak++;
  }
  for (let i = 0; i < thermalFailStreak; i++) {
    thermalTracker.failStreak++;
  }

  return {
    engineUnit: engineTracker,
    thermalUnit: thermalTracker,
  };
};

describe("Panel State Determination", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    // Initialize config store with defaults
    const configStore = useConfigStore();
    configStore.$patch({
      units: {
        warningThreshold: 5,
        errorThreshold: 25,
      },
    });
  });

  describe("default state", () => {
    it("should return default state when no issues", () => {
      const engine = createMockEngineUnit();
      const thermal = createMockThermalUnit();
      const connection = createMockConnection();

      const state = getNewState(engine, thermal, connection);

      expect(state.active).toBe(false);
      expect(state.message).toBeUndefined();
    });
  });

  describe("activation state", () => {
    it("should detect activation when blockValue & 1", () => {
      const engine = createMockEngineUnit({ blockValue: 1 });
      const thermal = createMockThermalUnit();
      const connection = createMockConnection();

      const state = getNewState(engine, thermal, connection);

      expect(state.active).toBe(true);
      expect(state.message?.text).toContain("AKTIVN");
      expect(state.message?.sound).toBe("Aktivace");
    });
  });

  describe("inspection messages", () => {
    it("should warn about inspection not done", () => {
      const engine = createMockEngineUnit({ inspectionNotDoneForDays: 5 });
      const thermal = createMockThermalUnit();
      const connection = createMockConnection();

      const state = getNewState(engine, thermal, connection);

      expect(state.active).toBe(false);
      expect(state.message?.text).toContain("5");
      expect(state.message?.text).toContain("neprovedena");
    });
  });

  describe("engine block states", () => {
    it("should detect babybox out of service (bit 256)", () => {
      const engine = createMockEngineUnit({ blockValue: 256 });
      const thermal = createMockThermalUnit();
      const connection = createMockConnection();

      const state = getNewState(engine, thermal, connection);

      expect(state.active).toBe(false);
      expect(state.message?.text).toContain("mimo provoz");
    });

    it("should detect temperature out of range (bit 4 or 8)", () => {
      const engine = createMockEngineUnit({ blockValue: 4 });
      const thermal = createMockThermalUnit();
      const connection = createMockConnection();

      const state = getNewState(engine, thermal, connection);

      expect(state.message?.text).toContain("Teplota mimo rozsah");
    });

    it("should detect door fault (bit 128)", () => {
      const engine = createMockEngineUnit({ blockValue: 128 });
      const thermal = createMockThermalUnit();
      const connection = createMockConnection();

      const state = getNewState(engine, thermal, connection);

      expect(state.message?.text).toContain("Porucha");
    });

    it("should detect babybox was opened (bit 2 without bit 1)", () => {
      const engine = createMockEngineUnit({ blockValue: 2 });
      const thermal = createMockThermalUnit();
      const connection = createMockConnection();

      const state = getNewState(engine, thermal, connection);

      expect(state.message?.text).toContain("otev");
      expect(state.message?.sound).toBe("BylOtevren");
    });

    it("should detect service door opened (bit 64)", () => {
      const engine = createMockEngineUnit({ blockValue: 64 });
      const thermal = createMockThermalUnit();
      const connection = createMockConnection();

      const state = getNewState(engine, thermal, connection);

      expect(state.message?.text).toContain("Servisn");
    });
  });

  describe("thermal block states", () => {
    it("should detect fault in babybox (bit 4)", () => {
      const engine = createMockEngineUnit();
      const thermal = createMockThermalUnit({ blockValue: 4 });
      const connection = createMockConnection();

      const state = getNewState(engine, thermal, connection);

      expect(state.message?.text).toContain("Závada v babyboxu");
    });

    it("should detect backup power fault (bit 2)", () => {
      const engine = createMockEngineUnit();
      const thermal = createMockThermalUnit({ blockValue: 2 });
      const connection = createMockConnection();

      const state = getNewState(engine, thermal, connection);

      expect(state.message?.text).toContain("záložního zdroje");
    });

    it("should detect power outage (bit 1)", () => {
      const engine = createMockEngineUnit();
      const thermal = createMockThermalUnit({ blockValue: 1 });
      const connection = createMockConnection();

      const state = getNewState(engine, thermal, connection);

      expect(state.message?.text).toContain("Výpadek");
    });
  });

  describe("door states", () => {
    it("should detect door opening (bit 1 or 2)", () => {
      const engine = createMockEngineUnit({ doorState: 1 });
      const thermal = createMockThermalUnit();
      const connection = createMockConnection();

      const state = getNewState(engine, thermal, connection);

      expect(state.message?.text).toContain("otev");
      expect(state.message?.sound).toBe("Otevirani");
    });

    it("should detect obstacle in door (bit 4 or 64)", () => {
      const engine = createMockEngineUnit({ doorState: 4 });
      const thermal = createMockThermalUnit();
      const connection = createMockConnection();

      const state = getNewState(engine, thermal, connection);

      expect(state.message?.text).toContain("ka");
    });

    it("should detect door is open (bit 8)", () => {
      const engine = createMockEngineUnit({ doorState: 8 });
      const thermal = createMockThermalUnit();
      const connection = createMockConnection();

      const state = getNewState(engine, thermal, connection);

      expect(state.message?.text).toContain("otev");
    });

    it("should detect door closing (bit 16 or 32)", () => {
      const engine = createMockEngineUnit({ doorState: 16 });
      const thermal = createMockThermalUnit();
      const connection = createMockConnection();

      const state = getNewState(engine, thermal, connection);

      expect(state.message?.text).toContain("zav");
    });
  });

  describe("connection errors", () => {
    it("should show warning when connection is degraded", () => {
      const engine = createMockEngineUnit();
      const thermal = createMockThermalUnit();
      // warningThreshold * 2 + 1 = 11
      const connection = createMockConnection(6, 6);

      const state = getNewState(engine, thermal, connection);

      expect(state.message?.text).toContain("Navazuji");
    });

    it("should show error when connection is lost", () => {
      const engine = createMockEngineUnit();
      const thermal = createMockThermalUnit();
      // errorThreshold * 2 + 1 = 51
      const connection = createMockConnection(26, 26);

      const state = getNewState(engine, thermal, connection);

      expect(state.message?.text).toContain("Chyba");
      expect(state.message?.sound).toBe("ZtrataSpojeni");
    });
  });

  describe("state priority", () => {
    it("activation should take precedence over other states", () => {
      const engine = createMockEngineUnit({
        blockValue: 1 | 2, // activated + was opened
        inspectionNotDoneForDays: 5,
      });
      const thermal = createMockThermalUnit();
      const connection = createMockConnection();

      const state = getNewState(engine, thermal, connection);

      expect(state.active).toBe(true);
      expect(state.message?.text).toContain("AKTIVN");
    });

    it("connection error should take precedence over activation", () => {
      const engine = createMockEngineUnit({ blockValue: 1 });
      const thermal = createMockThermalUnit();
      const connection = createMockConnection(26, 26);

      const state = getNewState(engine, thermal, connection);

      expect(state.message?.text).toContain("Chyba");
    });
  });
});
