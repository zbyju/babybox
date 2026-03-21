import express, { Request, Response, Router } from "express";

import { modules } from "../index.js";

export const router: Router = express.Router();

router.get("/refresh", async (req: Request, res: Response) => {
  modules.onIncomingData();
  res.status(200).send({ msg: "Ok" });
});
