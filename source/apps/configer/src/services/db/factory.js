import { mainConfig } from "./main.js";
import { versionConfig } from "./version.js";
export class DbFactory {
    constructor() {
        throw new Error("Don't call constructor, use static `getInstance` method");
    }
    static mainDb;
    static versionDb;
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
            DbFactory.versionDb = await versionConfig();
        }
        return DbFactory.versionDb;
    }
}
