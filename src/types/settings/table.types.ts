import type { Ref } from "vue";

export enum SettingsTableRowValueType {
  String = "string",
  Temperature = "temperature",
  Voltage = "voltage",
  Seconds = "seconds",
  Days = "days",
}

export interface SettingsTableRowTemplate {
  label: string;
  type: SettingsTableRowValueType;
  name: string;
  recommended: string;
  note: string;
  placeholder?: string;
}

export interface SettingsTableRow extends SettingsTableRowTemplate {
  index: number;
}

export interface SettingsTableRowValue {
  engine: Ref<string>;
  thermal: Ref<string>;
  value: Ref<string>;
  state: Ref<SettingsTableRowState>;
}

export enum SettingsTableRowState {
  Neutral,
  Changed,
  Success,
  Warning,
  Error,
}
