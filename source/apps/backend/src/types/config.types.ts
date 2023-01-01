export interface MainConfig {
  babybox: MainConfigBabybox;
  backend: MainConfigBackend;
  configer: MainConfigConfiger;
  startup: MainConfigStartup;
  units: MainConfigUnits;
  camera: MainConfigCamera;
  pc: MainConfigPc;
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

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MainConfigStartup {}

export interface MainConfigUnits {
  engine: MainConfigUnit;
  thermal: MainConfigUnit;
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

export interface MainConfigPc {
  os: "windows" | "ubuntu";
}

export interface MainConfigApp {
  password: string;
}
