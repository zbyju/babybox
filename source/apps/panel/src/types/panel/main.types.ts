import type { Maybe } from "@/types/generic.types";

export interface Message {
  text: string;
  color: string;
  sound?: string;
}

export interface PanelState {
  message: Maybe<Message>;
  active: boolean;
}
