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
  fontSize: number;
  prependBabyboxBeforeName: boolean;
}

export interface AppConfig {
  requestTimeout: number;
  requestDelay: number;
  colonDelay: number;
}

export interface Config {
  babybox: BabyboxConfig;
  camera: CameraConfig;
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
}

export interface State {
  config: Config | null;
  time: moment.Moment | null;
  timePC: moment.Moment | null;
  data: Data | null;
  message: Message | null;
  active: boolean; // TODO: Change to a state variable
  thermalUnit: ThermalUnit;
  engineUnit: EngineUnit;
  connection: Connection;
}

export enum CameraType {
  dahua = "DAHUA",
  avtech = "AVTECH",
}
