import type { z } from "zod";

import type { panelReadableConfigSchema } from "@/api/configBoundary";

export type Config = z.infer<typeof panelReadableConfigSchema>;
export type AppConfig = Config["app"];
export type BabyboxConfig = Config["babybox"];
export type BackendConfig = Config["backend"];
export type CameraConfig = Config["camera"];
export type UnitsConfig = Config["units"];
export type VoltageConfig = UnitsConfig["voltage"];
