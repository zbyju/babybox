import { defineStore } from "pinia";

export interface Config {
  babybox: ConfigBabybox;
  fontSize: ConfigFontSize;
  camera: ConfigCamera;
  units: ConfigUnits;
  app: ConfigApp;
}

export interface ConfigApp {
  password: string;
  colonDelay: number;
}

export interface ConfigBabybox {
  name: string;
  prependBabyboxBeforeName: boolean;
}

export interface ConfigCamera {
  ip: string;
  username: string;
  password: string;
  updateDelay: number;
  cameraType: string;
}

export interface ConfigUnits {
  engine: {
    ip: string;
  };
  thermal: {
    ip: string;
  };
  postfix: string;
  postfixWatchdog: string;
  requestTimeout: number;
  requestDelay: number;
  warningThreshold: number;
  errorThreshold: number;
}

export interface ConfigFontSize {
  babyboxName: number;
  bigClockBigger: number;
  bigClockSmaller: number;
  smallClock: number;
  tableHeading: number;
  tableLabel: number;
  tableValue: number;
  message: number;
}

export const useConfigStore = defineStore("config", {
  state: () => ({
    initialised: false as boolean,
    app: null as ConfigApp,
    babybox: null as ConfigBabybox,
    camera: null as ConfigCamera,
    units: null as ConfigUnits,
    fontSize: null as ConfigFontSize,
  }),
  actions: {
    setConfig(config: Config) {
      this.app = config.app;
      this.babybox = config.babybox;
      this.camera = config.camera;
      this.units = config.units;
      this.fontSize = config.fontSize;
      this.initialised = true;
    },
  },
});
