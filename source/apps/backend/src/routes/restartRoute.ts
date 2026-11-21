import type { Request, Response } from "express";
import express from "express";

import { modules } from "../index.js";

export const router = express.Router();

router.get("/refresh", async (req: Request, res: Response) => {
  modules.onIncomingData();
  res.status(200).send({ msg: "Ok" });
});
