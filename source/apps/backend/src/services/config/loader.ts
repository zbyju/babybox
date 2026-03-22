import { MainConfig } from "../../types/config.types";
import { DbFactory } from "./factory";

export async function loadConfig(): Promise<MainConfig> {
  const db = await DbFactory.getMainDb();
  const config = db.data();
  if (!config) {
    throw new Error("Config not found - ensure configs/main.json exists");
  }
  return config;
}
