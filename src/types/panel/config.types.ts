export interface Config {
  api: ApiConfig;
  app: AppConfig;
  babybox: BabyboxConfig;
  camera: CameraConfig;
  units: UnitsConfig;
}

export interface ApiConfig {
  baseApiUrl: string;
  requestTimeout: number;
}

export interface AppConfig {
  password: string;
  colonDelay: number;
}

export interface BabyboxConfig {
  name: string;
  prependBabyboxBeforeName: boolean;
}

export interface CameraConfig {
  ip: string;
  username: string;
  password: string;
  updateDelay: number;
  cameraType: string;
}

export enum CameraType {
  dahua = "DAHUA",
  avtech = "AVTECH",
}

export interface UnitsConfig {
  requestDelay: number;
  warningThreshold: number;
  errorThreshold: number;
  voltage: VoltageConfig;
}

export interface VoltageConfig {
  divider: number;
  multiplier: number;
  addition: number;
}
