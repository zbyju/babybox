// Re-export types from schema
export type {
  MainConfig,
  BabyboxConfig,
  BackendConfig,
  ConfigerConfig,
  VoltageConfig,
  UnitConfig,
  UnitsConfig,
  CameraType,
  CameraConfig,
  PcConfig,
  AppConfig,
} from "../schemas/config.schema.js";

// Legacy type aliases for backward compatibility
export type MainConfigBabybox = import("../schemas/config.schema.js").BabyboxConfig;
export type MainConfigBackend = import("../schemas/config.schema.js").BackendConfig;
export type MainConfigConfiger = import("../schemas/config.schema.js").ConfigerConfig;
export type MainConfigStartup = Record<string, unknown>;
export type MainConfigUnits = import("../schemas/config.schema.js").UnitsConfig;
export type MainConfigVoltage = import("../schemas/config.schema.js").VoltageConfig;
export type MainConfigUnit = import("../schemas/config.schema.js").UnitConfig;
export type MainConfigCamera = import("../schemas/config.schema.js").CameraConfig;
export type MainConfigPc = import("../schemas/config.schema.js").PcConfig;
export type MainConfigApp = import("../schemas/config.schema.js").AppConfig;
