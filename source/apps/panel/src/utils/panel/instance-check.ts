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

export const isInstanceOfConfig = (object: any): object is Config => {
  return (
    typeof object === "object" &&
    "backend" in object &&
    isInstanceOfBackendConfig(object.backend) &&
    "app" in object &&
    isInstanceOfAppConfig(object.app) &&
    "babybox" in object &&
    isInstanceOfBabyboxConfig(object.babybox) &&
    "camera" in object &&
    isInstanceOfCameraConfig(object.camera) &&
    "units" in object &&
    isInstanceOfUnitsConfig(object.units)
  );
};

export const isInstanceOfBackendConfig = (
  object: any,
): object is BackendConfig => {
  return (
    typeof object === "object" &&
    "url" in object &&
    "requestTimeout" in object &&
    "port" in object
  );
};

export const isInstanceOfAppConfig = (object: any): object is AppConfig => {
  return typeof object === "object" && "password" in object;
};

export const isInstanceOfBabyboxConfig = (
  object: any,
): object is BabyboxConfig => {
  return typeof object === "object" && "name" in object;
};

export const isInstanceOfCameraConfig = (
  object: any,
): object is CameraConfig => {
  return (
    typeof object === "object" &&
    "ip" in object &&
    "username" in object &&
    "password" in object &&
    "updateDelay" in object &&
    "cameraType" in object
  );
};

export const isInstanceOfUnitsConfig = (object: any): object is UnitsConfig => {
  return (
    typeof object === "object" &&
    "engine" in object &&
    isInstanceOfUnitConfig(object.engine) &&
    "thermal" in object &&
    isInstanceOfUnitConfig(object.thermal) &&
    "requestDelay" in object &&
    "warningThreshold" in object &&
    "errorThreshold" in object &&
    "voltage" in object &&
    isInstanceOfVoltageConfig(object.voltage)
  );
};

export const isInstanceOfUnitConfig = (object: any): object is UnitConfig => {
  return typeof object === "object" && "ip" in object;
};

export const isInstanceOfVoltageConfig = (
  object: any,
): object is VoltageConfig => {
  return (
    typeof object === "object" &&
    "divider" in object &&
    "multiplier" in object &&
    "addition" in object
  );
};
