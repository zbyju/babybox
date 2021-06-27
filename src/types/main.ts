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
}
