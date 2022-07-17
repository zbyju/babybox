import type { Maybe } from "../generic.types";

export type TableData = {
  blocks: TableBlockData[];
  rows: TableRowData[];
};

export type TableBlockData = TableBlockTemplate & TableBlockValue;
export type TableRowData = TableRowTemplate & TableRowValue;

export interface TableRowTemplate {
  field: string;
  label: string;
}

export interface TableBlockTemplate {
  field: string;
  activeLabel: string;
  inactiveLabel: string;
  colspan: number;
  color?: string;
}

// Rows with label - value in the table
export interface TableRowValue {
  state: TableRowState;
  value?: string;
}

export enum TableRowState {
  Ok, // Data are ok, just display
  Error, // Fetching error / parsing error
  Loading, // Loading data

  // Data are ok, display with color
  ColorSuccess,
  ColorError,
  ColorWarning,
}

export enum TableBlockState {
  Inactive, // Data are ok, just display normally
  Loading, // Loading data
  Error, // Some error (fetching, parsing)

  // Data are ok, display with color
  ColorSuccess,
  ColorError,
  ColorWarning,
}

// Top rows label with states colored different colors
export interface TableBlockValue {
  state: TableBlockState;
}

export interface TableValues {
  blockData: Record<string, TableBlockValue>;
  rowData: Record<string, TableRowValue>;
}

export interface TableTemperaturesValues extends TableValues {
  blockData: {
    isHeatingCasing: TableBlockValue;
    isHeatingAir: TableBlockValue;
    isCoolingAir: TableBlockValue;
  };
  rowData: {
    optimalTemperature: TableRowValue;
    innerTemperature: TableRowValue;
    outsideTemperature: TableRowValue;
    bottomTemperature: TableRowValue;
    topTemperature: TableRowValue;
    casingTemperature: TableRowValue;
  };
}

export interface TableDoorsValues {
  blockData: {
    isBlocked: TableBlockValue;
  };
  rowData: {
    leftPosition: TableRowValue;
    rightPosition: TableRowValue;
    leftLoad: TableRowValue;
    rightLoad: TableRowValue;
    beamAboveContainer: TableRowValue;
  };
}

export interface TableVoltagesValues {
  rowData: {
    inVoltage: TableRowValue;
    batteryVoltage: TableRowValue;
    unitsVoltage: TableRowValue;
    gsmVoltage: TableRowValue;
    inGoalVoltage: TableRowValue;
    batteryGoalVoltage: TableRowValue;
    unitsGoalVoltage: TableRowValue;
  };
}

export interface TableConnectionValues {
  rowData: {
    requests: TableRowValue;
    successfulRequests: TableRowValue;
    failedRequests: TableRowValue;
    quality: TableRowValue;
    timeout: TableRowValue;
    timeToInspection: TableRowValue;
  };
}
