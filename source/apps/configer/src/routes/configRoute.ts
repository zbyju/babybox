import * as express from "express";
import type { Request, Response } from "express";
import { DbFactory } from "../services/db/factory.js";
import type { UpdateResult } from "../services/db/main.js";
export const router = express.Router();

function answer(res: Response, result: UpdateResult) {
  if (result.status === "invalid") {
    return res
      .status(400)
      .json({ msg: "Body is not a valid MainConfig", errors: result.errors });
  }
  if (result.status === "write-failed") {
    return res.status(500).json({ msg: result.msg });
  }
  return res.json(result.config);
}

router.get("/main", async (req: Request, res: Response) => {
  const main = await DbFactory.getMainDb();
  res.json(main.data());
});

router.get(["/version", "/versions"], async (req: Request, res: Response) => {
  const version = await DbFactory.getVersionDb();
  res.json(version.data());
});

/*
 * A full replace: send the whole config. A key left out is filled from base.json,
 * not from the stored config, so a partial body resets those keys to the default.
 */
router.put("/main", async (req: Request, res: Response) => {
  const main = await DbFactory.getMainDb();
  return answer(res, await main.update(req.body));
});

/*
 * A partial update: send only what changed. A key left out keeps the value the box
 * is running on, where the same key left out of a PUT goes back to the default.
 */
router.patch("/main", async (req: Request, res: Response) => {
  const main = await DbFactory.getMainDb();
  return answer(res, await main.patch(req.body));
});
