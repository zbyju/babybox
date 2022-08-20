import type { Moment } from "moment";

export enum LogEntryType {
  Info = "info",
  Success = "success",
  Warning = "warning",
  Error = "error",
}

export interface LogEntry {
  message: string;
  type: LogEntryType;
  date: Moment;
}

export interface SettingsResult {
  type: LogEntryType;
  message?: string;
}

export interface SettingsSendResult {
  unit: "thermal" | "engine";
  value: number;
  index: number;
  result: boolean;
}

export interface SettingsToSend {
  unit: "thermal" | "engine";
  index: number;
  value: number;
}
