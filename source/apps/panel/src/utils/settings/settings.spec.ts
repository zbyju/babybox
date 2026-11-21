import { describe, expect, it } from "vitest";

import {
  type SettingsTableRow,
  type SettingsTableRowValue,
  SettingsTableRowState,
  SettingsTableRowValueType,
} from "@/types/settings/table.types";

import { readUnitSettings, settingsSendToStates } from "./settings";

describe("readUnitSettings", () => {
  it("splits the engine and thermal values", () => {
    expect(
      readUnitSettings({
        msg: "Successfully fetched settings.",
        data: { engine: "1|2|3", thermal: "4|5" },
      }),
    ).toEqual({ engine: ["1", "2", "3"], thermal: ["4", "5"] });
  });

  /* SettingsForm skips the update and logs an error on undefined. */
  it.each([
    ["null", null],
    ["a string", "<html>Not Found</html>"],
    ["a body with no data", { msg: "Successfully fetched settings." }],
    ["data that is a string", { data: "1|2" }],
    ["data with no thermal", { data: { engine: "1|2" } }],
    ["an engine that is not a string", { data: { engine: 1, thermal: "4" } }],
    ["a thermal that is null", { data: { engine: "1|2", thermal: null } }],
  ])("is undefined for %s", (_, body) => {
    expect(readUnitSettings(body)).toBeUndefined();
  });
});

describe("settingsSendToStates", () => {
  const rows: SettingsTableRow[] = [
    {
      index: 0,
      name: "engine row",
      engine: 108,
      thermal: null,
      type: SettingsTableRowValueType.Seconds,
      recommended: "",
      note: "",
    },
    {
      index: 1,
      name: "thermal row",
      engine: null,
      thermal: 100,
      type: SettingsTableRowValueType.Temperature,
      recommended: "",
      note: "",
    },
  ];

  const values: SettingsTableRowValue[] = rows.map(() => ({
    engine: "1",
    thermal: "1",
    value: "2",
    state: SettingsTableRowState.Changed,
  }));

  const engineResult = { unit: "engine", index: 108, value: 2, result: true };
  const thermalResult = { unit: "thermal", index: 100, value: 2, result: true };

  /* The save flow catches the throw and marks the sent rows as failed. */
  it.each([[{ msg: "Saved." }], [{ results: "nope" }], [null]])(
    "throws when the answer is %p",
    (data) => {
      expect(() =>
        settingsSendToStates({ status: 200, data }, values, rows),
      ).toThrow();
    },
  );

  it.each([
    ["no unit", { ...thermalResult, unit: undefined }],
    ["an index that is a string", { ...thermalResult, index: "100" }],
    ["no value", { ...thermalResult, value: undefined }],
    ["a result that is not a boolean", { ...thermalResult, result: "yes" }],
  ])("drops a result with %s and keeps a valid one", (_, malformed) => {
    const states = settingsSendToStates(
      { status: 200, data: { results: [engineResult, malformed] } },
      values,
      rows,
    ).map((value) => value.state);

    expect(states).toEqual([
      SettingsTableRowState.Success,
      SettingsTableRowState.Changed,
    ]);
  });
});
