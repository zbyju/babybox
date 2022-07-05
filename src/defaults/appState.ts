import type { AppState } from "@/types/panel/main";

export const getDefaultAppState = (): AppState => {
    return {
        message: null,
        active: false,
    };
};
