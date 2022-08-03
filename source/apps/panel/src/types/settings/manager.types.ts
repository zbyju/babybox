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
