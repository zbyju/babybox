export type StreamStatus = "stopped" | "starting" | "running" | "error";

export interface StreamState {
  status: StreamStatus;
  pid: number | null;
  lastError: string | null;
  startedAt: Date | null;
  restartCount: number;
}

export interface StreamManager {
  start(): void;
  stop(): void;
  restart(): void;
  getState(): StreamState;
  getOutputDir(): string;
}
