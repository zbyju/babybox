import express, { Request, Response, Router } from "express";

import { fetchDataCommon, updateWatchdog } from "../fetch/fetchFromUnits.js";
import { Unit } from "../types/units.types.js";

export const router: Router = express.Router();

router.get("/data", async (req: Request, res: Response) => {
  const response = await fetchDataCommon(Unit.Engine, req.query);

  if (response.data) {
    return res.status(response.status).send({
      msg: response.msg,
      data: response.data,
    });
  } else {
    return res.status(response.status).send({
      msg: response.msg,
    });
  }
});

router.put("/watchdog", async (req: Request, res: Response) => {
  const response = await updateWatchdog();

  return res.status(response.status).send({ msg: response.msg });
});
