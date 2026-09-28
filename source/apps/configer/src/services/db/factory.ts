import { mainConfig } from "./main.js";
import type { MainDb } from "./main.js";
import { versionConfig } from "./version.js";
import type { VersionDb } from "./version.js";

export class DbFactory {
  constructor() {
    throw new Error("Don't call constructor, use static `getInstance` method");
  }

  /*
   * Cache the promise, not the resolved value,
   * so concurrent callers share one init instead of each running mainConfig() again.
   * mainConfig() writes main.json, so a second run can interleave writes to it.
   */
  static mainDb: MainDb | undefined;
  static versionDb: VersionDb | undefined;

  static getMainDb(): MainDb {
    if (!DbFactory.mainDb) {
      DbFactory.mainDb = mainConfig();
    }
    return DbFactory.mainDb;
  }

  static getVersionDb(): VersionDb {
    if (!DbFactory.versionDb) {
      DbFactory.versionDb = versionConfig();
    }
    return DbFactory.versionDb;
  }
}
