import moment from "moment";
import { Connection } from "./connection";
import { EngineUnit, ThermalUnit } from "./units-data";

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
  colonDelay: number;
}

export interface UnitsConfig {
  engine: {
    ip: string;
  };
  thermal: {
    ip: string;
  };
  postfix: string;
  requestTimeout: number;
  requestDelay: number;
  warningThreshold: number;
  errorThreshold: number;
}

export interface FontSizeConfig {
  babyboxName: number;
  bigClockBigger: number;
  bigClockSmaller: number;
  smallClock: number;
  tableHeading: number;
  tableLabel: number;
  tableValue: number;
  message: number;
}

export interface Config {
  babybox: BabyboxConfig;
  fontSizes: FontSizeConfig;
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
  time: moment.Moment | null;
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
