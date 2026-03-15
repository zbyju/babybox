import {
  MainConfigSchema,
  BabyboxConfigSchema,
  BackendConfigSchema,
  ConfigerConfigSchema,
  UnitsConfigSchema,
  VoltageConfigSchema,
  CameraConfigSchema,
  PcConfigSchema,
  AppConfigSchema,
} from "../schemas/config.schema.js";

// Re-export types from schema
export type {
  MainConfig,
  BabyboxConfig,
  BackendConfig,
  ConfigerConfig,
  VoltageConfig,
  UnitsConfig,
  CameraType,
  CameraConfig,
  PcConfig,
  AppConfig,
} from "../schemas/config.schema.js";

// Legacy interface aliases for backward compatibility
export type MainConfigBabybox = import("../schemas/config.schema.js").BabyboxConfig;
export type MainConfigBackend = import("../schemas/config.schema.js").BackendConfig;
export type MainConfigConfiger = import("../schemas/config.schema.js").ConfigerConfig;
export type MainConfigUnits = import("../schemas/config.schema.js").UnitsConfig;
export type MainConfigVoltage = import("../schemas/config.schema.js").VoltageConfig;
export type MainConfigCamera = import("../schemas/config.schema.js").CameraConfig;
export type MainConfigPc = import("../schemas/config.schema.js").PcConfig;
export type MainConfigApp = import("../schemas/config.schema.js").AppConfig;
export type MainConfigStartup = Record<string, unknown>;
export type MainConfigUnit = { ip: string };

// Type guard functions using Zod schemas
export function isInstanceOfMainConfig(obj: unknown): obj is import("../schemas/config.schema.js").MainConfig {
  return MainConfigSchema.safeParse(obj).success;
}

export function isInstanceOfMainConfigBabybox(obj: unknown): obj is MainConfigBabybox {
  return BabyboxConfigSchema.safeParse(obj).success;
}

export function isInstanceOfMainConfigBackend(obj: unknown): obj is MainConfigBackend {
  return BackendConfigSchema.safeParse(obj).success;
}

export function isInstanceOfMainConfigConfiger(obj: unknown): obj is MainConfigConfiger {
  return ConfigerConfigSchema.safeParse(obj).success;
}

export function isInstanceOfMainConfigUnits(obj: unknown): obj is MainConfigUnits {
  return UnitsConfigSchema.safeParse(obj).success;
}

export function isInstanceOfMainConfigVoltage(obj: unknown): obj is MainConfigVoltage {
  return VoltageConfigSchema.safeParse(obj).success;
}

export function isInstanceOfMainConfigCamera(obj: unknown): obj is MainConfigCamera {
  return CameraConfigSchema.safeParse(obj).success;
}

export function isInstanceOfMainConfigPc(obj: unknown): obj is MainConfigPc {
  return PcConfigSchema.safeParse(obj).success;
}

export function isInstanceOfMainConfigApp(obj: unknown): obj is MainConfigApp {
  return AppConfigSchema.safeParse(obj).success;
}

export function isInstanceOfMainConfigUnit(obj: unknown): obj is MainConfigUnit {
  if (!obj || typeof obj !== "object") return false;
  return "ip" in obj && typeof (obj as Record<string, unknown>).ip === "string";
}
