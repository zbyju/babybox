import { AppState } from "@/types/main";

export const getDefaultAppState = (): AppState => {
  return {
    message: null,
    active: false,
  };
};
