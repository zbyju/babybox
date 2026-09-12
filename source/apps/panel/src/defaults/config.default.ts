import { defaultConfig } from "@babybox/config-schema";

import type {
  AppConfig,
  BabyboxConfig,
  BackendConfig,
  CameraConfig,
  UnitsConfig,
} from "@/types/panel/config.types";

/*
 * What the stores hold until configer answers. The values are the schema's defaults,
 * which are the same ones configer falls back to, so the panel never shows a number
 * no box would ever have.
 */
export const getDefaultBackendConfig = (): BackendConfig =>
  defaultConfig().backend;

export const getDefaultAppConfig = (): AppConfig => defaultConfig().app;

export const getDefaultBabyboxConfig = (): BabyboxConfig =>
  defaultConfig().babybox;

export const getDefaultCameraConfig = (): CameraConfig =>
  defaultConfig().camera;

export const getDefaultUnitsConfig = (): UnitsConfig => defaultConfig().units;
