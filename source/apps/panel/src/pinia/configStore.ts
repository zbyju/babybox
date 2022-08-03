import { defineStore } from "pinia";

import {
  getDefaultApiConfig,
  getDefaultAppConfig,
  getDefaultBabyboxConfig,
  getDefaultCameraConfig,
  getDefaultUnitsConfig,
} from "@/defaults/config.default";
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
    api: getDefaultApiConfig() as ApiConfig,
    app: getDefaultAppConfig() as AppConfig,
    babybox: getDefaultBabyboxConfig() as BabyboxConfig,
    camera: getDefaultCameraConfig() as CameraConfig,
    units: getDefaultUnitsConfig() as UnitsConfig,
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

  getters: {
    config(): Config {
      return {
        api: this.api,
        app: this.app,
        babybox: this.babybox,
        camera: this.camera,
        units: this.units,
      };
    },
  },
});
