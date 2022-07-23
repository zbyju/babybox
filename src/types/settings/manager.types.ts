import type { Moment } from "moment";

export type LogEntryType = "info" | "success" | "warning" | "error";

export interface LogEntry {
  message: string;
  type: LogEntryType;
  date: Moment;
}
