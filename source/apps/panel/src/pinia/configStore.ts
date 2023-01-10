import { defineStore } from "pinia";

import {
  getDefaultAppConfig,
  getDefaultBabyboxConfig,
  getDefaultBackendConfig,
  getDefaultCameraConfig,
  getDefaultUnitsConfig,
} from "@/defaults/config.default";
import type {
  AppConfig,
  BabyboxConfig,
  BackendConfig,
  CameraConfig,
  Config,
  UnitsConfig,
} from "@/types/panel/config.types";

export const useConfigStore = defineStore("config", {
  state: () => ({
    initialised: false as boolean,
    backend: getDefaultBackendConfig() as BackendConfig,
    app: getDefaultAppConfig() as AppConfig,
    babybox: getDefaultBabyboxConfig() as BabyboxConfig,
    camera: getDefaultCameraConfig() as CameraConfig,
    units: getDefaultUnitsConfig() as UnitsConfig,
  }),
  actions: {
    setConfig(config: Config) {
      this.initialised = true;
      this.app = config.app;
      this.backend = config.backend;
      this.babybox = config.babybox;
      this.camera = config.camera;
      this.units = config.units;
    },
  },

  getters: {
    config(): Config {
      return {
        backend: this.backend,
        app: this.app,
        babybox: this.babybox,
        camera: this.camera,
        units: this.units,
      };
    },
  },
});
