import * as express from "express";
import { Request, Response } from "express";
import { DbFactory } from "../services/db/factory.js";
import { isInstanceOfMainConfig } from "../types/main.types.js";
export const router = express.Router();

router.get("/main", async (req: Request, res: Response) => {
  const main = await DbFactory.getMainDb();
  res.json(main.data());
});

router.put("/main", async (req: Request, res: Response) => {
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
