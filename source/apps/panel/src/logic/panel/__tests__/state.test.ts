import { defaultConfig } from "@babybox/config-schema";
import { describe, expect, it } from "vitest";

import type { Connection } from "@/types/panel/connection.types";
import type { EngineUnit, ThermalUnit } from "@/types/panel/units.types";

import { createConnectionStats } from "../connections";
import { DOOR_STATE, ENGINE_BLOCK, THERMAL_BLOCK } from "../flags";
import { getNewState } from "../state";

function engine(opts?: {
  block?: number;
  door?: number;
  inspection?: number;
}): EngineUnit {
  return {
    data: {
      temperature: { inner: undefined },
      engine: {
        left: { load: undefined, position: undefined },
        right: { load: undefined, position: undefined },
      },
      door: {
        state: opts?.door,
        isBarrierInterrupted: undefined,
        isServiceDoorOpened: undefined,
      },
      timers: { inspectionMessage: undefined, serviceDoor: undefined },
      misc: { inspectionNotDoneForDays: opts?.inspection },
      time: undefined,
      isBlocked: undefined,
      blockValue: opts?.block,
    },
    settings: {
      temperature: { minimalInner: undefined, maximalInner: undefined },
      engine: {
        allowedLoad: undefined,
        timeForEngineStart: undefined,
        closedThreshold: undefined,
        openedThreshold: undefined,
        timeToBeOpenedInSeconds: undefined,
      },
      misc: {
        pcTimeoutConnection: undefined,
        emailPeriodInSeconds: undefined,
        criticalEmailPeriodInSeconds: undefined,
        inspectionPeriodInSeconds: undefined,
      },
    },
  };
}

function thermal(block?: number): ThermalUnit {
  return {
    data: {
      temperature: {
        inner: undefined,
        outside: undefined,
        casing: undefined,
        top: undefined,
        bottom: undefined,
        isHeatingCasing: undefined,
        isHeatingAir: undefined,
        isCoolingAir: undefined,
      },
      voltage: {
        in: undefined,
        battery: undefined,
        units: undefined,
        gsm: undefined,
      },
      door: { isServiceDoorOpened: undefined },
      time: undefined,
      isBlocked: undefined,
      blockValue: block,
    },
    settings: {
      temperature: {
        hysteresisHeating: undefined,
        hysteresisCooling: undefined,
        optimalInner: undefined,
        minimalInner: undefined,
        maximalInner: undefined,
        maximalCasing: undefined,
        maximalPeltier: undefined,
      },
      voltage: { minimal: undefined },
      misc: { emailPeriodInSeconds: undefined },
    },
  };
}

function connection(engineMs = 0, thermalMs = 0): Connection {
  const engineUnit = createConnectionStats();
  const thermalUnit = createConnectionStats();
  engineUnit.failStreakMs = engineMs;
  thermalUnit.failStreakMs = thermalMs;
  return { engineUnit, thermalUnit };
}

const units = defaultConfig().units;

describe("getNewState", () => {
  it("returns the idle default when both units are missing", () => {
    expect(getNewState(undefined, undefined, connection(), units)).toEqual({
      message: undefined,
      active: false,
    });
  });

  it("reports a missed inspection", () => {
    const state = getNewState(
      engine({ inspection: 2 }),
      undefined,
      connection(),
      units,
    );
    expect(state.message?.text).toBe("2 dny neprovedena zkouška!");
    expect(state.active).toBe(false);
  });

  it("reports out of service from the engine block bit", () => {
    const state = getNewState(
      engine({ block: ENGINE_BLOCK.OUT_OF_SERVICE }),
      undefined,
      connection(),
      units,
    );
    expect(state.message?.text).toBe("Babybox mimo provoz");
  });

  it("reports an input-voltage thermal block", () => {
    const state = getNewState(
      undefined,
      thermal(THERMAL_BLOCK.INPUT_VOLTAGE),
      connection(),
      units,
    );
    expect(state.message?.text).toBe("Výpadek napětí!");
  });

  it("plays the opened sound when the box was opened and is not active", () => {
    const state = getNewState(
      engine({ block: ENGINE_BLOCK.WAS_OPENED }),
      undefined,
      connection(),
      units,
    );
    expect(state.message).toEqual({
      text: "Babybox byl otevřen!",
      color: "color-text-warning",
      sound: "BylOtevren",
    });
  });

  it("treats an active box as higher priority than an opening door", () => {
    const state = getNewState(
      engine({
        block: ENGINE_BLOCK.ACTIVE,
        door: DOOR_STATE.OPENING_A,
      }),
      undefined,
      connection(),
      units,
    );
    expect(state.active).toBe(true);
    expect(state.message?.text).toBe("Babybox AKTIVNÍ!");
    expect(state.message?.sound).toBe("Aktivace");
  });

  it("overrides an active box with a long connection outage", () => {
    const state = getNewState(
      engine({ block: ENGINE_BLOCK.ACTIVE }),
      undefined,
      connection(units.errorThreshold * 2 * units.requestDelay + 1, 0),
      units,
    );
    expect(state.active).toBe(false);
    expect(state.message?.text).toBe("Chyba spojení!");
    expect(state.message?.sound).toBe("ZtrataSpojeni");
  });
});
