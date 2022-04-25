export type valueType =
  | "string"
  | "temperature"
  | "voltage"
  | "seconds"
  | "days";

export type SettingsRowData = {
  label: string;
  name: string;
  recommended: string;
  note: string;
  type: valueType;
};
export type SettingsTableData = Array<SettingsRowData>;
