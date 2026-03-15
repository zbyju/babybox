import { z } from "zod";

export const BabyboxConfigSchema = z.object({
  name: z.string(),
});

export const BackendConfigSchema = z.object({
  url: z.string(),
  port: z.number().int().positive(),
  requestTimeout: z.number().int().positive(),
});

export const ConfigerConfigSchema = z.object({
  url: z.string(),
  port: z.number().int().positive(),
  requestTimeout: z.number().int().positive(),
});

export const VoltageConfigSchema = z.object({
  divider: z.number(),
  multiplier: z.number(),
  addition: z.number(),
});

export const UnitConfigSchema = z.object({
  ip: z.string(),
});

export const UnitsConfigSchema = z.object({
  engine: UnitConfigSchema,
  thermal: UnitConfigSchema,
  requestDelay: z.number().int().positive(),
  warningThreshold: z.number().int().nonnegative(),
  errorThreshold: z.number().int().nonnegative(),
  voltage: VoltageConfigSchema,
});

export const CameraTypeSchema = z.enum(["dahua", "avtech", "vivotek", "hikvision"]);

export const CameraConfigSchema = z.object({
  ip: z.string(),
  username: z.string(),
  password: z.string(),
  updateDelay: z.number().int().positive(),
  cameraType: CameraTypeSchema,
});

export const PcConfigSchema = z.object({
  os: z.enum(["windows", "ubuntu"]),
});

export const AppConfigSchema = z.object({
  password: z.string(),
  refreshRequestLimit: z.number().int().positive().optional(),
});

export const StartupConfigSchema = z.object({}).passthrough();

export const MainConfigSchema = z.object({
  babybox: BabyboxConfigSchema,
  backend: BackendConfigSchema,
  configer: ConfigerConfigSchema,
  startup: StartupConfigSchema,
  units: UnitsConfigSchema,
  camera: CameraConfigSchema,
  pc: PcConfigSchema,
  app: AppConfigSchema,
});

// Infer types from schemas
export type MainConfig = z.infer<typeof MainConfigSchema>;
export type BabyboxConfig = z.infer<typeof BabyboxConfigSchema>;
export type BackendConfig = z.infer<typeof BackendConfigSchema>;
export type ConfigerConfig = z.infer<typeof ConfigerConfigSchema>;
export type VoltageConfig = z.infer<typeof VoltageConfigSchema>;
export type UnitConfig = z.infer<typeof UnitConfigSchema>;
export type UnitsConfig = z.infer<typeof UnitsConfigSchema>;
export type CameraType = z.infer<typeof CameraTypeSchema>;
export type CameraConfig = z.infer<typeof CameraConfigSchema>;
export type PcConfig = z.infer<typeof PcConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;
