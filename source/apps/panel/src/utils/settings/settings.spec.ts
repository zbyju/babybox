import { describe, expect, it } from "vitest";

import {
  type SettingsTableRow,
  type SettingsTableRowValue,
  SettingsTableRowState,
  SettingsTableRowValueType,
} from "@/types/settings/table.types";

import { settingsSendToStates, settingsSendToStatesError } from "./settings";

const row: SettingsTableRow = {
  index: 0,
  name: "two-unit row",
  engine: 108,
  thermal: 100,
  type: SettingsTableRowValueType.Seconds,
  recommended: "",
  note: "",
};

const values: SettingsTableRowValue[] = [{
  engine: "1",
  thermal: "1",
  value: "2",
  state: SettingsTableRowState.Changed,
}];

describe("settings table acknowledgements", () => {
  it("marks a confirmed one-unit row as successful", () => {
    const updated = settingsSendToStates(
      [{ unit: "engine", index: 108, value: 2, result: true }],
      values,
      [{ ...row, thermal: null }],
    );
    expect(updated[0]?.state).toBe(SettingsTableRowState.Success);
  });

  it("marks a two-unit row with one rejected result as a warning", () => {
    const updated = settingsSendToStates(
      [
        { unit: "engine", index: 108, value: 2, result: true },
        { unit: "thermal", index: 100, value: 2, result: false },
      ],
      values,
      [row],
    );
    expect(updated[0]?.state).toBe(SettingsTableRowState.Warning);
  });

  it("marks every submitted row as failed when confirmations are untrustworthy", () => {
    const updated = settingsSendToStatesError(
      [{ unit: "thermal", index: 100, value: 2 }],
      values,
      [row],
    );
    expect(updated[0]?.state).toBe(SettingsTableRowState.Error);
  });
});
