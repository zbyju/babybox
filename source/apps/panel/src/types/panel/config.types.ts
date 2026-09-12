import type { MainConfig } from "@babybox/config-schema";

/*
 * The panel reads five of the eight sections of configer's config. The shape of each
 * one comes from @babybox/config-schema, so the panel cannot drift from the file on
 * the box.
 */
export type Config = Pick<
  MainConfig,
  "app" | "babybox" | "backend" | "camera" | "units"
>;

export type AppConfig = MainConfig["app"];
export type BabyboxConfig = MainConfig["babybox"];
export type BackendConfig = MainConfig["backend"];
export type CameraConfig = MainConfig["camera"];
export type UnitsConfig = MainConfig["units"];
export type VoltageConfig = UnitsConfig["voltage"];
