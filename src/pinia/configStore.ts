import { defineStore } from "pinia";

import type { Maybe } from "@/types/generic.types";
import type {
  ApiConfig,
  AppConfig,
  BabyboxConfig,
  CameraConfig,
  Config,
  UnitsConfig,
} from "@/types/panel/config.types";

export const useConfigStore = defineStore("config", {
  state: () => ({
    initialised: false as boolean,
    api: undefined as Maybe<ApiConfig>,
    app: undefined as Maybe<AppConfig>,
    babybox: undefined as Maybe<BabyboxConfig>,
    camera: undefined as Maybe<CameraConfig>,
    units: undefined as Maybe<UnitsConfig>,
  }),
  actions: {
    setConfig(config: Config) {
      this.initialised = true;
      this.app = config.app;
      this.api = config.api;
      this.babybox = config.babybox;
      this.camera = config.camera;
      this.units = config.units;
    },
  },
});
