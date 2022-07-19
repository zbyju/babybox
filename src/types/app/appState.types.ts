export enum AppState {
  Ok,
  Loading,
  Error,
}

export interface AppStateData {
  state: AppState;
  message?: string;
}
