export interface RowData {
  label: string;
  value: string;
}

export interface BlockData {
  label: string;
  active: boolean;
  colspan: number;
  color?: string;
}

export type BlockRows = BlockData[];

export type TableData = RowData[];
export type TableBlockData = BlockRows[];
