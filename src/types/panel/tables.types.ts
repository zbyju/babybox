import type { Maybe } from "../generic.types";

export interface RowData {
  label: string;
  value: string;
  loading?: boolean;
  failedFetching?: boolean;
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

export interface TableTemperaturesValues {
  blockData: {
    isHeatingCasing: {
      value: boolean;
    };
    isHeatingAir: {
      value: boolean;
    };
    isCoolingAir: {
      value: boolean;
    };
  };
  rowData: {
    optimalTemperature: {
      value: string;
    };
    innerTemperature: {
      value: string;
    };
    outsideTemperature: {
      value: string;
    };
    bottomTemperature: {
      value: string;
    };
    topTemperature: {
      value: string;
    };
    casingTemperature: {
      value: string;
    };
  };
}

export interface TableDoorsValues {
  blockData: {
    isBlocked: {
      value: boolean;
    };
  };
  rowData: {
    leftPosition: {
      value: string;
    };
    rightPosition: {
      value: string;
    };
    leftLoad: {
      value: string;
    };
    rightLoad: {
      value: string;
    };
    beamAboveContainer: {
      value: string;
    };
  };
}

export interface TableVoltagesValues {
  rowData: {
    inVoltage: {
      value: string;
    };
    batteryVoltage: {
      value: string;
    };
    unitsVoltage: {
      value: string;
    };
    gsmVoltage: {
      value: string;
    };
    inGoalVoltage: {
      value: string;
    };
    batteryGoalVoltage: {
      value: string;
    };
    unitsGoalVoltage: {
      value: string;
    };
  };
}

export interface TableConnectionValues {
  rowData: {
    requests: {
      value: string;
    };
    successfulRequests: {
      value: string;
    };
    failedRequests: {
      value: string;
    };
    quality: {
      value: string;
    };
    timeout: {
      value: string;
    };
    timeToInspection: {
      value: string;
    };
  };
}
