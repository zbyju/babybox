export interface Message {
  text: string;
  color: string;
  sound?: string;
}

export interface AppState {
  message?: Message;
  active: boolean;
}

export enum CameraType {
  dahua = "DAHUA",
  avtech = "AVTECH",
}
