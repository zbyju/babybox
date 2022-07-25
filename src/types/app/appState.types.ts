export enum AppState {
  Ok,
  Loading,
  Error,
  Trying,
}

export interface AppStateData {
  state: AppState;
  message?: string;
  versionBackend?: string;
  engineIP?: string;
  thermalIP?: string;
}
