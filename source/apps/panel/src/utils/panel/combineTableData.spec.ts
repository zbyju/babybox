import { describe, expect, it } from "vitest";

import {
  type TableBlockTemplate,
  type TableRowTemplate,
  TableBlockState,
  TableRowState,
  TableValuesState,
} from "@/types/panel/tables.types";

import { combineTableData } from "./combineTableData";

const rows: TableRowTemplate[] = [
  { field: "inner", label: "Inner" },
  { field: "outside", label: "Outside" },
];

const blocks: TableBlockTemplate[] = [
  { field: "heating", activeLabel: "On", inactiveLabel: "Off", colspan: 1 },
  { field: "cooling", activeLabel: "On", inactiveLabel: "Off", colspan: 1 },
];

describe("combineTableData", () => {
  it("puts each value next to its template", () => {
    const data = combineTableData(rows, blocks, {
      state: TableValuesState.Ok,
      blockValues: {
        heating: { state: TableBlockState.ColorSuccess },
        cooling: { state: TableBlockState.Inactive },
      },
      rowValues: {
        inner: { state: TableRowState.Ok, value: "20.00°C" },
        outside: { state: TableRowState.Ok, value: "5.00°C" },
      },
    });

    expect(data.blocks.map((block) => block.state)).toEqual([
      TableBlockState.ColorSuccess,
      TableBlockState.Inactive,
    ]);
    expect(data.rows).toEqual([
      {
        field: "inner",
        label: "Inner",
        state: TableRowState.Ok,
        value: "20.00°C",
      },
      {
        field: "outside",
        label: "Outside",
        state: TableRowState.Ok,
        value: "5.00°C",
      },
    ]);
  });

  /* The cell shows "Chyba", not an empty value that looks like a working unit. */
  it("marks a template field with no value as an error", () => {
    const data = combineTableData(rows, blocks, {
      state: TableValuesState.Ok,
      blockValues: { heating: { state: TableBlockState.ColorSuccess } },
      rowValues: { inner: { state: TableRowState.Ok, value: "20.00°C" } },
    });

    expect(data.blocks.map((block) => block.state)).toEqual([
      TableBlockState.ColorSuccess,
      TableBlockState.Error,
    ]);
    expect(data.rows.map((row) => row.state)).toEqual([
      TableRowState.Ok,
      TableRowState.Error,
    ]);
  });
});
