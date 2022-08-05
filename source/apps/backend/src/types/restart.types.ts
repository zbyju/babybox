import { Moment } from "moment";

export interface RestartRepository {
  lastRequest: Moment | null;
  errorStreak: number;
  errorThreshold: number;

  onIncomingRequest: () => void;
}
