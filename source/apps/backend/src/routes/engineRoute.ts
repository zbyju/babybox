import express from "express";
import { Request, Response } from "express";

import { fetchDataCommon, updateWatchdog } from "../fetch/fetchFromUnits.js";
import { Unit } from "../types/units.types.js";
import { transformThermalData } from "../utils/transformData.js";

export const router = express.Router();

router.get("/data", async (req: Request, res: Response) => {
  const response = await fetchDataCommon(Unit.Engine, req.query);

  const raw = req.query?.raw ? parseInt(req.query.raw.toString()) > 0 : false;

  const data = raw ? response.data : transformThermalData(response.data);

  if (response.data) {
    return res.status(response.status).send({
      msg: response.msg,
      data,
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
