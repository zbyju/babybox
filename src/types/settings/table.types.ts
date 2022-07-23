import type { Ref } from "vue";

export type SettingsTableRowValueType =
  | "string"
  | "temperature"
  | "voltage"
  | "seconds"
  | "days";

export interface SettingsTableRowTemplate {
  label: string;
  type: SettingsTableRowValueType;
  name: string;
  recommended: string;
  note: string;
  placeholder?: string;
}

export interface SettingsTableRow extends SettingsTableRowTemplate {
  engine: Ref<string>;
  thermal: Ref<string>;
  // state: SettingsTableRowState;
}

export enum SettingsTableRowState {
  Neutral,
  Changed,
  Success,
  Warning,
  Error,
}
