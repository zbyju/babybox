import { MainConfig } from "../../types/config.types.js";
import { DbFactory } from "./factory.js";

export async function loadConfig(): Promise<MainConfig> {
  const db = await DbFactory.getMainDb();
  const config = db.data();
  if (!config) {
    throw new Error("Config not found - ensure configs/main.json exists");
  }
  return config;
}
