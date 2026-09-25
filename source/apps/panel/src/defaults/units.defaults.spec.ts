import { describe, expect, it } from "vitest";

import type { VoltageConfig } from "@/types/panel/config.types";
import type { RawUnitVariable } from "@/types/panel/units.types";

import {
  rawEngineUnitToEngineUnit,
  rawThermalUnitToThermalUnit,
} from "./units.defaults";

/* A real date and time at indices 39 to 44, so moment does not warn. */
const TIME: Record<number, string> = {
  39: "25",
  40: "9",
  41: "2026",
  42: "8",
  43: "30",
  44: "0",
};

const rawUnit = (length: number): RawUnitVariable[] =>
  Array.from({ length }, (_, index) => ({ index, value: TIME[index] ?? "1" }));

const voltageConfig: VoltageConfig = {
  divider: 3400,
  multiplier: 100,
  addition: 0,
};

/*
 * The panel loop catches the throw and counts a failed request.
 * A default value instead would show a short answer as a working unit.
 */
describe("rawEngineUnitToEngineUnit", () => {
  it("reads an answer that reaches index 59", () => {
    expect(() => rawEngineUnitToEngineUnit(rawUnit(60))).not.toThrow();
  });

  it("throws on an answer that stops before index 59", () => {
    expect(() => rawEngineUnitToEngineUnit(rawUnit(59))).toThrow(
      "no value at index 59",
    );
  });
});

describe("rawThermalUnitToThermalUnit", () => {
  it("reads an answer that reaches index 46", () => {
    expect(() =>
      rawThermalUnitToThermalUnit(rawUnit(47), voltageConfig),
    ).not.toThrow();
  });

  it("throws on an answer that stops before index 46", () => {
    expect(() =>
      rawThermalUnitToThermalUnit(rawUnit(46), voltageConfig),
    ).toThrow("no value at index 46");
  });
});
