import type {
  ApiConfig,
  AppConfig,
  BabyboxConfig,
  CameraConfig,
  Config,
  UnitsConfig,
  VoltageConfig,
} from "@/types/panel/config.types";

export const getDefaultConfig = (): Config => {
  return {
    api: getDefaultApiConfig(),
    app: getDefaultAppConfig(),
    babybox: getDefaultBabyboxConfig(),
    camera: getDefaultCameraConfig(),
    units: getDefaultUnitsConfig(),
  };
};

export const getDefaultApiConfig = (): ApiConfig => {
  return {
    baseApiUrl: "http://localhost:5000/api/v1",
    requestTimeout: 5000,
  };
};

export const getDefaultAppConfig = (): AppConfig => {
  return {
    password: "test",
  };
};

export const getDefaultBabyboxConfig = (): BabyboxConfig => {
  return {
    name: "BABYBOX_NAME",
    prependBabyboxBeforeName: true,
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
    requestDelay: 2000,
    warningThreshold: 5,
    errorThreshold: 25,
    voltage: getDefaultVoltageConfig(),
  };
};

export const getDefaultVoltageConfig = (): VoltageConfig => {
  return {
    divider: 3400,
    multiplier: 100,
    addition: 0,
  };
};
