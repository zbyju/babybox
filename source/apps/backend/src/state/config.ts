import type { MainConfig } from "../types/config.types.js";

let _config: MainConfig | null = null;

export function getConfig(): MainConfig {
  if (!_config) {
    throw new Error("Config not initialized");
  }
  return _config;
}

export function setConfig(config: MainConfig): void {
  _config = config;
}
