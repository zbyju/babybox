/*
 * The config shape lives in @babybox/config-schema, so configer, the panel and the
 * backend describe it once. Configer reaches it through this file, so there is one
 * import path for the shape inside the app.
 */
export {
  defaultConfig,
  parseMainConfig,
  validateMainConfig,
} from "@babybox/config-schema";
export type { ConfigError, MainConfig } from "@babybox/config-schema";
