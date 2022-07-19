import type { PanelState } from "@/types/panel/main.types";

export const getDefaultPanelState = (): PanelState => {
  return {
    message: undefined,
    active: false,
  };
};
