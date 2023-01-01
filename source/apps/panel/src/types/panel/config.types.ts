export interface Config {
  app: AppConfig;
  backend: BackendConfig;
  babybox: BabyboxConfig;
  camera: CameraConfig;
  units: UnitsConfig;
}

export interface BackendConfig {
  url: string;
  port: number;
  requestTimeout: number;
}

export interface AppConfig {
  password: string;
  version: string;
}

export interface BabyboxConfig {
  name: string;
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
  engine: UnitConfig;
  thermal: UnitConfig;
  requestDelay: number;
  warningThreshold: number;
  errorThreshold: number;
  voltage: VoltageConfig;
}

export interface UnitConfig {
  ip: string;
}

export interface VoltageConfig {
  divider: number;
  multiplier: number;
  addition: number;
}
