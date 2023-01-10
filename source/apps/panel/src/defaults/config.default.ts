import type {
  AppConfig,
  BabyboxConfig,
  BackendConfig,
  CameraConfig,
  Config,
  UnitConfig,
  UnitsConfig,
  VoltageConfig,
} from "@/types/panel/config.types";

export const getDefaultConfig = (): Config => {
  return {
    backend: getDefaultBackendConfig(),
    app: getDefaultAppConfig(),
    babybox: getDefaultBabyboxConfig(),
    camera: getDefaultCameraConfig(),
    units: getDefaultUnitsConfig(),
  };
};

export const getDefaultBackendConfig = (): BackendConfig => {
  return {
    url: "/api/v1",
    port: 5000,
    requestTimeout: 5000,
  };
};

export const getDefaultAppConfig = (): AppConfig => {
  return {
    version: "unknown",
    password: "test",
  };
};

export const getDefaultBabyboxConfig = (): BabyboxConfig => {
  return {
    name: "BABYBOX_NAME",
  };
};

export const getDefaultCameraConfig = (): CameraConfig => {
  return {
    ip: "10.1.1.7",
    username: "username",
    password: "password",
    updateDelay: 1000,
    cameraType: "DAHUA",
  };
};

export const getDefaultUnitsConfig = (): UnitsConfig => {
  return {
    engine: getDefaultUnitConfig("engine"),
    thermal: getDefaultUnitConfig("thermal"),
    requestDelay: 2000,
    warningThreshold: 5,
    errorThreshold: 25,
    voltage: getDefaultVoltageConfig(),
  };
};

export const getDefaultUnitConfig = (
  unit: "engine" | "thermal",
): UnitConfig => {
  return {
    ip: unit === "engine" ? "10.1.1.5" : "10.1.1.6",
  };
};

export const getDefaultVoltageConfig = (): VoltageConfig => {
  return {
    divider: 3400,
    multiplier: 100,
    addition: 0,
  };
};
