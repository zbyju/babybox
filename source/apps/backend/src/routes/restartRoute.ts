import express, { Request, Response, Router } from "express";

import { modules } from "../index";

export const router: Router = express.Router();

router.get("/refresh", async (_req: Request, res: Response) => {
  modules.onIncomingData();
  res.status(200).send({ msg: "Ok" });
});
