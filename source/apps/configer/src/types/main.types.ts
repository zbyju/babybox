export interface MainConfig {
  babybox: MainConfigBabybox;
  backend: MainConfigBackend;
  configer: MainConfigConfiger;
  startup: MainConfigStartup;
  units: MainConfigUnits;
  camera: MainConfigCamera;
  app: MainConfigApp;
}

export interface MainConfigBabybox {
  name: string;
}

export interface MainConfigBackend {
  url: string;
  port: number;
  requestTimeout: number;
}

export interface MainConfigConfiger {
  url: string;
  port: number;
  requestTimeout: number;
}

export interface MainConfigStartup {}

export interface MainConfigUnits {
  requestDelay: number;
  warningThreshold: number;
  errorThreshold: number;
  voltage: MainConfigVoltage;
}

export interface MainConfigVoltage {
  divider: number;
  multiplier: number;
  addition: number;
}

export interface MainConfigUnit {
  ip: string;
}

export interface MainConfigCamera {
  ip: string;
  username: string;
  password: string;
  updateDelay: number;
  cameraType: string;
}

export interface MainConfigApp {
  password: string;
}
