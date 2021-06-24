import moment from "moment";

export interface CameraConfig {
  ip: string;
  username: string;
  password: string;
  updateDelay: number;
}

export interface BabyboxConfig {
  name: string;
  fontSize: number;
  prependBabyboxBeforeName: boolean;
}

export interface Config {
  babybox: BabyboxConfig;
  camera: CameraConfig;
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

export interface State {
  config: Config | null;
  time: moment.Moment | null;
  timePC: moment.Moment | null;
  data: Data | null;
}
