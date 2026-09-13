export { defaultConfig } from "./defaults.js";
export { cameraTypes, mainConfigSchema, pcOsTypes } from "./schema.js";
export type {
  MainConfig,
  MainConfigCameraType,
  MainConfigPcOs,
} from "./schema.js";
export { parseMainConfig, validateMainConfig } from "./validate.js";
export type { ConfigError, ParseResult } from "./validate.js";
