import * as express from "express";
import { Request, Response } from "express";

import { modules } from "..";

export const router = express.Router();

router.get("/", async (req: Request, res: Response) => {
  modules.onIncomingData();
  res.status(200).send({ msg: "Ok" });
});
