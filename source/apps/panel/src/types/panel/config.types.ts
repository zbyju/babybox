import { z } from "zod";

// Read only the shape the live panel needs. A legacy value can fail the
// stricter write schema and still be safe for the panel to read.
export const panelReadableConfigSchema = z.object({
  app: z.object({
    password: z.string(),
    refreshRequestLimit: z.number().nullish(),
  }),
  babybox: z.object({ name: z.string() }),
  backend: z.object({
    url: z.string(),
    port: z.number(),
    requestTimeout: z.number(),
  }),
  camera: z.object({
    ip: z.string(),
    username: z.string(),
    password: z.string(),
    cameraType: z.string(),
    updateDelay: z.number(),
  }),
  units: z.object({
    engine: z.object({ ip: z.string() }),
    thermal: z.object({ ip: z.string() }),
    requestDelay: z.number(),
    warningThreshold: z.number(),
    errorThreshold: z.number(),
    voltage: z.object({
      divider: z.number(),
      multiplier: z.number(),
      addition: z.number(),
    }),
  }),
});

export type Config = z.infer<typeof panelReadableConfigSchema>;
export type AppConfig = Config["app"];
export type BabyboxConfig = Config["babybox"];
export type BackendConfig = Config["backend"];
export type CameraConfig = Config["camera"];
export type UnitsConfig = Config["units"];
export type VoltageConfig = UnitsConfig["voltage"];
