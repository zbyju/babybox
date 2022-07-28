export enum SettingsTableRowValueType {
  String = "string",
  Temperature = "temperature",
  Voltage = "voltage",
  Seconds = "seconds",
  Days = "days",
}

export interface SettingsTableRowTemplate {
  name: string;
  engine: number | null;
  thermal: number | null;
  type: SettingsTableRowValueType;
  recommended: string;
  note: string;
  placeholder?: string;
}

export interface SettingsTableRow extends SettingsTableRowTemplate {
  index: number;
}

export interface SettingsTableRowValue {
  engine: string | null;
  thermal: string | null;
  value: string;
  state: SettingsTableRowState;
}

export enum SettingsTableRowState {
  Neutral,
  Changed,
  Success,
  Warning,
  Error,
}
