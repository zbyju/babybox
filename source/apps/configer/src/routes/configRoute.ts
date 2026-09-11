import * as express from "express";
import { Request, Response } from "express";
import { DbFactory } from "../services/db/factory.js";
export const router = express.Router();

router.get("/main", async (req: Request, res: Response) => {
  const main = await DbFactory.getMainDb();
  res.json(main.data());
});

router.get(["/version", "/versions"], async (req: Request, res: Response) => {
  const version = await DbFactory.getVersionDb();
  res.json(version.data());
});

router.put("/main", async (req: Request, res: Response) => {
  const main = await DbFactory.getMainDb();
  const result = await main.update(req.body);
  if (result.status === "invalid") {
    return res
      .status(400)
      .json({ msg: "Body is not a valid MainConfig", errors: result.errors });
  }
  if (result.status === "write-failed") {
    return res.status(500).json({ msg: result.msg });
  }
  return res.json(result.config);
});
