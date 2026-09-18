import { defaultConfig } from "@babybox/config-schema";
import { describe, expect, it } from "vitest";

import {
  rawEngineUnitToEngineUnit,
  rawThermalUnitToThermalUnit,
} from "@/defaults/units.defaults";
import type { RawEngineUnit, RawThermalUnit } from "@/types/panel/units.types";
import { getFullDate } from "@/utils/time";

import { ENGINE_RAM, RAM_FIELD_COUNT, THERMAL_RAM } from "../ram";

function raw(length = RAM_FIELD_COUNT): RawEngineUnit {
  const fields = Array.from({ length }, (_, index) => ({
    index,
    value: "0",
  }));
  if (length >= RAM_FIELD_COUNT) {
    fields[ENGINE_RAM.TIME_DAY].value = "1";
    fields[ENGINE_RAM.TIME_MONTH].value = "1";
    fields[ENGINE_RAM.TIME_YEAR].value = "2020";
    fields[ENGINE_RAM.TIME_HOUR].value = "0";
    fields[ENGINE_RAM.TIME_MINUTE].value = "0";
    fields[ENGINE_RAM.TIME_SECOND].value = "0";
  }
  return fields;
}

describe("rawEngineUnitToEngineUnit", () => {
  it("returns undefined when the RAM window is short", () => {
    expect(rawEngineUnitToEngineUnit(raw(10))).toBeUndefined();
  });

  it("maps inner temperature from RAM 28 as a value times 100", () => {
    const fields = raw();
    fields[ENGINE_RAM.INNER_TEMP].value = "3650";
    const unit = rawEngineUnitToEngineUnit(fields);
    expect(unit?.data.temperature.inner).toBe(36.5);
  });

  it("maps the engine clock into unix milliseconds", () => {
    const fields = raw();
    fields[ENGINE_RAM.TIME_DAY].value = "18";
    fields[ENGINE_RAM.TIME_MONTH].value = "9";
    fields[ENGINE_RAM.TIME_YEAR].value = "2026";
    fields[ENGINE_RAM.TIME_HOUR].value = "12";
    fields[ENGINE_RAM.TIME_MINUTE].value = "0";
    fields[ENGINE_RAM.TIME_SECOND].value = "0";
    const unit = rawEngineUnitToEngineUnit(fields);
    expect(getFullDate(unit?.data.time)).toBe("18.09.2026");
  });

  it("treats 255 as true for boolean fields", () => {
    const fields = raw();
    fields[ENGINE_RAM.BARRIER].value = "255";
    const unit = rawEngineUnitToEngineUnit(fields);
    expect(unit?.data.door.isBarrierInterrupted).toBe(true);
  });
});

describe("rawThermalUnitToThermalUnit", () => {
  it("returns undefined when the RAM window is short", () => {
    expect(
      rawThermalUnitToThermalUnit(
        raw(3) as RawThermalUnit,
        defaultConfig().units.voltage,
      ),
    ).toBeUndefined();
  });

  it("maps inner temperature from RAM 29", () => {
    const fields = raw();
    fields[THERMAL_RAM.INNER_TEMP].value = "2800";
    const unit = rawThermalUnitToThermalUnit(
      fields,
      defaultConfig().units.voltage,
    );
    expect(unit?.data.temperature.inner).toBe(28);
  });
});
