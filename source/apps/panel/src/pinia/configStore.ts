import { defaultConfig } from "@babybox/config-schema";
import { defineStore } from "pinia";

import type { Config } from "@/types/panel/config.types";

export const useConfigStore = defineStore("config", {
  /* The schema's defaults, so nothing shows a number no box would ever hold. */
  state: () => {
    const { app, babybox, backend, camera, units } = defaultConfig();
    return { initialised: false, app, babybox, backend, camera, units };
  },
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
