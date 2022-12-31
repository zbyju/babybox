import { mainConfig, MainDb } from "./main.js";
import { VersionDb } from "./version.js";

export class DbFactory {
  constructor() {
    throw new Error("Don't call constructor, use static `getInstance` method");
  }

  static mainDb: any | undefined;
  static versionDb: any | undefined;

  // Always call with await!!!
  static async getMainDb(): MainDb {
    if (!DbFactory.mainDb) {
      DbFactory.mainDb = await mainConfig();
    }
    return DbFactory.mainDb;
  }

  // Always call with await!!!
  static async getVersionDb(): VersionDb {
    if (!DbFactory.versionDb) {
      DbFactory.versionDb = await mainConfig();
    }
    return DbFactory.versionDb;
  }
}
