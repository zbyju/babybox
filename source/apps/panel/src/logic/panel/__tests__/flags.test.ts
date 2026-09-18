import { describe, expect, it } from "vitest";

import { DOOR_STATE, ENGINE_BLOCK, THERMAL_BLOCK } from "../flags";

describe("panel bit flags", () => {
  it("keeps the engine masks the panel has always used", () => {
    expect(ENGINE_BLOCK.ACTIVE).toBe(1);
    expect(ENGINE_BLOCK.WAS_OPENED).toBe(2);
    expect(ENGINE_BLOCK.TEMPERATURE_A).toBe(4);
    expect(ENGINE_BLOCK.TEMPERATURE_B).toBe(8);
    expect(ENGINE_BLOCK.SERVICE_DOORS).toBe(64);
    expect(ENGINE_BLOCK.DOOR_FAULT).toBe(128);
    expect(ENGINE_BLOCK.OUT_OF_SERVICE).toBe(256);
  });

  it("keeps the thermal masks that match BLOKACE", () => {
    expect(THERMAL_BLOCK.INPUT_VOLTAGE).toBe(1);
    expect(THERMAL_BLOCK.BATTERY).toBe(2);
    expect(THERMAL_BLOCK.STABILIZED_RAIL).toBe(4);
  });

  it("keeps the door-state masks the panel has always used", () => {
    expect(DOOR_STATE.OPENING_A).toBe(1);
    expect(DOOR_STATE.OPENING_B).toBe(2);
    expect(DOOR_STATE.OBSTACLE_A).toBe(4);
    expect(DOOR_STATE.OPEN).toBe(8);
    expect(DOOR_STATE.CLOSING_A).toBe(16);
    expect(DOOR_STATE.CLOSING_B).toBe(32);
    expect(DOOR_STATE.OBSTACLE_B).toBe(64);
  });
});
