import { createPinia, setActivePinia } from "pinia";
import { describe, expect, it } from "vitest";

import { useConfigStore } from "@/pinia/configStore";
import { SettingsTableRowValueType as Type } from "@/types/settings/table.types";

import { settingsRowValueToValue } from "./conversions";

describe("settings unit conversions", () => {
  it.each([
    [Type.String, "12", 12],
    [Type.Seconds, "12", 12],
    [Type.Temperature, "2.5", 250],
    [Type.Days, "2", 172800],
  ] as const)("converts %s without reading Pinia", (type, value, expected) => {
    setActivePinia(undefined);
    expect(settingsRowValueToValue(value, type)).toBe(expected);
  });

  it("uses the configured voltage divider in the voltage case", () => {
    setActivePinia(createPinia());
    useConfigStore().units.voltage.divider = 64;
    expect(settingsRowValueToValue("2.01", Type.Voltage)).toBe(129);
  });
});
