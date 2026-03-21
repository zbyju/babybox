import { mainConfig, MainDb } from "./main.js";
import { versionConfig, VersionDb } from "./version.js";

export class DbFactory {
  constructor() {
    throw new Error("Don't call constructor, use static methods");
  }

  static mainDb: Awaited<MainDb> | undefined;
  static versionDb: Awaited<VersionDb> | undefined;

  static async getMainDb(): Promise<Awaited<MainDb>> {
    if (!DbFactory.mainDb) {
      DbFactory.mainDb = await mainConfig();
    }
    return DbFactory.mainDb;
  }

  static async getVersionDb(): Promise<Awaited<VersionDb>> {
    if (!DbFactory.versionDb) {
      DbFactory.versionDb = await versionConfig();
    }
    return DbFactory.versionDb;
  }
}
