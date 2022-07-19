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

export enum TableValuesState {
  Ok,
  Loading,
  Error,
}

export interface TableValues {
  state: TableValuesState;
  blockValues?: Record<string, TableBlockValue>;
  rowValues?: Record<string, TableRowValue>;
}

export interface TableTemperaturesValues extends TableValues {
  blockValues?: {
    isHeatingCasing: TableBlockValue;
    isHeatingAir: TableBlockValue;
    isCoolingAir: TableBlockValue;
  };
  rowValues?: {
    optimalTemperature: TableRowValue;
    innerTemperature: TableRowValue;
    outsideTemperature: TableRowValue;
    bottomTemperature: TableRowValue;
    topTemperature: TableRowValue;
    casingTemperature: TableRowValue;
  };
}

export interface TableDoorsValues extends TableValues {
  blockValues?: {
    isBlocked: TableBlockValue;
  };
  rowValues?: {
    leftPosition: TableRowValue;
    rightPosition: TableRowValue;
    leftLoad: TableRowValue;
    rightLoad: TableRowValue;
    beamAboveContainer: TableRowValue;
  };
}

export interface TableVoltagesValues extends TableValues {
  rowValues?: {
    inVoltage: TableRowValue;
    batteryVoltage: TableRowValue;
    unitsVoltage: TableRowValue;
    gsmVoltage: TableRowValue;
    inGoalVoltage: TableRowValue;
    batteryGoalVoltage: TableRowValue;
    unitsGoalVoltage: TableRowValue;
  };
}

export interface TableConnectionValues extends TableValues {
  rowValues?: {
    requests: TableRowValue;
    successfulRequests: TableRowValue;
    failedRequests: TableRowValue;
    quality: TableRowValue;
    timeout: TableRowValue;
    timeToInspection: TableRowValue;
  };
}
