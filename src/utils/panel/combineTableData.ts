import type {
  TableBlockTemplate,
  TableData,
  TableRowTemplate,
  TableValues,
} from "@/types/panel/tables.types";

export function combineTableData(
  rowsTemplate: TableRowTemplate[],
  blocksTemplate: TableBlockTemplate[],
  values: TableValues,
): TableData {
  return {
    blocks: blocksTemplate.map((b) => {
      return {
        ...b,
        ...values.blockData[b.field],
      };
    }),
    rows: rowsTemplate.map((r) => {
      return {
        ...r,
        ...values.rowData[r.field],
      };
    }),
  };
}
