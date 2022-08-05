import * as express from "express";
import { Request, Response } from "express";

import { modules } from "..";
import { fetchDataCommon, updateWatchdog } from "../fetch/fetchFromUnits";
import { Unit } from "../types/units.types";
import { transformThermalData } from "../utils/transformData";

export const router = express.Router();

router.get("/data", async (req: Request, res: Response) => {
  modules.onIncomingData();
  const response = await fetchDataCommon(Unit.Engine, req.query);

  const raw = req.query?.raw ? parseInt(req.query.raw.toString()) > 0 : false;
  const query = {
    timeout: req.query?.timeout || process.env.DEFAULT_FETCH_TIMEOUT || 5000,
    raw,
  };

  const data = query.raw ? response.data : transformThermalData(response.data);

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
