import type { AppState } from "@/types/panel/main.types";

export const getDefaultAppState = (): AppState => {
  return {
    message: undefined,
    active: false,
  };
};
