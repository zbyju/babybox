import {
  TableBlockState,
  TableRowState,
  TableValuesState,
  type TableBlockTemplate,
  type TableData,
  type TableRowTemplate,
  type TableValues,
} from "@/types/panel/tables.types";

export function combineTableData(
  rowsTemplate: TableRowTemplate[],
  blocksTemplate: TableBlockTemplate[],
  values: TableValues,
): TableData {
  if (
    values.state === TableValuesState.Ok &&
    values.blockValues !== undefined &&
    values.rowValues !== undefined
  ) {
    console.log(values.blockValues);
    return {
      blocks: blocksTemplate.map((b) => {
        const value = values?.blockValues
          ? values.blockValues[b.field]
          : { state: TableBlockState.Error };
        return {
          ...b,
          ...value,
        };
      }),
      rows: rowsTemplate.map((r) => {
        const value = values?.rowValues
          ? values.rowValues[r.field]
          : { state: TableRowState.Error };
        return {
          ...r,
          ...value,
        };
      }),
    };
  }
  return {
    blocks: blocksTemplate.map((b) => {
      return {
        ...b,
        state: TableBlockState.Error,
      };
    }),
    rows: rowsTemplate.map((r) => {
      return {
        ...r,
        state: TableRowState.Error,
      };
    }),
  };
}
