import {
  type TableBlockTemplate,
  type TableData,
  type TableRowTemplate,
  type TableValues,
  TableBlockState,
  TableRowState,
  TableValuesState,
} from "@/types/panel/tables.types";

export function combineTableData(
  rowsTemplate: TableRowTemplate[],
  blocksTemplate: TableBlockTemplate[],
  values: TableValues,
): TableData {
  switch (values.state) {
    case TableValuesState.Ok:
      return {
        blocks: blocksTemplate.map((block) => ({
          ...block,
          ...(values.blockValues[block.field] ?? {
            state: TableBlockState.Error,
          }),
        })),
        rows: rowsTemplate.map((row) => ({
          ...row,
          ...(values.rowValues[row.field] ?? { state: TableRowState.Error }),
        })),
      };
    case TableValuesState.Loading:
      return {
        blocks: blocksTemplate.map((block) => ({
          ...block,
          state: TableBlockState.Loading,
        })),
        rows: rowsTemplate.map((row) => ({
          ...row,
          state: TableRowState.Loading,
        })),
      };
    case TableValuesState.Error:
      return {
        blocks: blocksTemplate.map((block) => ({
          ...block,
          state: TableBlockState.Error,
        })),
        rows: rowsTemplate.map((row) => ({
          ...row,
          state: TableRowState.Error,
        })),
      };
    default:
      return values satisfies never;
  }
}
