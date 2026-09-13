export interface Message {
  text: string;
  color: string;
  sound?: string;
}

export interface PanelState {
  message?: Message;
  active: boolean;
}
