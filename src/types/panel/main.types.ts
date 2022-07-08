import type { Moment } from "moment";
import type { Connection } from "./connection.types";
import type { EngineUnit, ThermalUnit } from "@/types/panel/units.types";

export interface CameraConfig {
  ip: string;
  username: string;
  password: string;
  updateDelay: number;
  cameraType: string;
}

export interface BabyboxConfig {
  name: string;
  prependBabyboxBeforeName: boolean;
}

export interface AppConfig {
  password: string;
  colonDelay: number;
}

export interface VoltageConfig {
  divider: number;
  multiplier: number;
  addition: number;
}

export interface UnitsConfig {
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
  voltage: VoltageConfig;
}

export interface Config {
  babybox: BabyboxConfig;
  camera: CameraConfig;
  units: UnitsConfig;
  app: AppConfig;
}

export interface Data {
  temperatureUnit: {
    temperatures: {
      inner: number;
      outside: number;
    };
  };
  engineUnit: {
    status: boolean;
  };
}

export interface Message {
  text: string;
  color: string;
  sound?: string;
}

export interface AppState {
  message?: Message;
  active: boolean;
}

export interface State {
  config: Config | null;
  time: Moment | null;
  data: Data | null;
  appState: AppState;
  thermalUnit: ThermalUnit;
  engineUnit: EngineUnit;
  connection: Connection;
}

export enum CameraType {
  dahua = "DAHUA",
  avtech = "AVTECH",
}
