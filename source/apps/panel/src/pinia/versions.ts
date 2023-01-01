import { defineStore } from "pinia";

import type { Versions } from "@/types/panel/versions.types";

export const useVersionsStore = defineStore("versions", {
  state: () => ({
    initialised: false as boolean,
    backend: "",
    frontend: "",
    startup: "",
    configer: "",
  }),
  actions: {
    setVersions(versions: Versions) {
      this.initialised = true;
      this.backend = versions.backend;
      this.frontend = versions.frontend;
      this.startup = versions.startup;
      this.configer = versions.configer;
    },
  },

  getters: {
    versions(): Versions {
      return {
        backend: this.backend,
        frontend: this.frontend,
        startup: this.startup,
        configer: this.configer,
      };
    },
  },
});
