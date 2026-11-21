import type { Request, Response } from "express";
import express from "express";
import { dataQuerySchema } from "../types/request.types.js";

import { fetchDataCommon, updateWatchdog } from "../fetch/fetchFromUnits.js";
import { Unit } from "../types/units.types.js";

export const router = express.Router();

router.get("/data", async (req: Request, res: Response) => {
  const response = await fetchDataCommon(
    Unit.Engine,
    dataQuerySchema.parse(req.query).timeout
  );

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
