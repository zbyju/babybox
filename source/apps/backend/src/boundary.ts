// Bundled into the standalone backend dist. See the build script.
export {
  bindingPort,
  httpErrorMetadataSchema,
  parseStartupLast,
  pcOsTypes,
  portSchema,
  settingSchema,
  z,
} from "../../../packages/config-schema/dist/index.js";
export type {
  Setting,
  SettingResult,
  StartupLast,
} from "../../../packages/config-schema/dist/index.js";
