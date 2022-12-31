import { mainConfig } from "./main.js";

export class DbFactory {
  constructor() {
    throw new Error("Don't call constructor, use static `getInstance` method");
  }

  static mainDb: Object | undefined;
  static versionDb: Object | undefined;

  // Always call with await!!!
  static async getMainDb() {
    if (!DbFactory.mainDb) {
      DbFactory.mainDb = await mainConfig();
    }
    return DbFactory.mainDb;
  }

  // Always call with await!!!
  static async getVersionDb() {
    if (!DbFactory.versionDb) {
      DbFactory.versionDb = await mainConfig();
    }
    return DbFactory.versionDb;
  }
}
