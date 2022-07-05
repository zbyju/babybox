export interface RowData {
    label: string;
    value: string;
    error?: boolean;
    success?: boolean;
    warning?: boolean;
}

export interface BlockData {
    label: string;
    nonActiveLabel?: string;
    active: boolean;
    colspan: number;
    color?: string;
}

export type BlockRows = BlockData[];

export type TableData = RowData[];
export type TableBlockData = BlockRows[];
