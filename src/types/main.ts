import moment from "moment";

export interface Config {
  babybox: {
    name: string;
    fontSize: number;
    prependBabyboxBeforeName: boolean;
  };
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
