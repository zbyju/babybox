import * as express from "express";
import { DbFactory } from "../services/db/factory.js";
import { isInstanceOfMainConfig } from "../types/main.types.js";
export const router = express.Router();
router.get("/main", async (req, res) => {
    const main = await DbFactory.getMainDb();
    res.json(main.data());
});
router.get(["/version", "/versions"], async (req, res) => {
    const version = await DbFactory.getVersionDb();
    res.json(version.data());
});
router.put("/main", async (req, res) => {
    const c = req.body;
    if (!isInstanceOfMainConfig(c)) {
        return res
            .status(400)
            .json({ msg: `${JSON.stringify(c)} is not a type of 'MainConfig'` });
    }
    const main = await DbFactory.getMainDb();
    await main.update(c);
    return res.json(main.data());
});
