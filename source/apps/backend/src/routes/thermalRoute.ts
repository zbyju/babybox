import type { Request, Response } from "express";
import express from "express";

import { fetchDataCommon } from "../fetch/fetchFromUnits.js";
import { Unit } from "../types/units.types.js";

export const router = express.Router();

router.get("/data", async (req: Request, res: Response) => {
  const response = await fetchDataCommon(Unit.Thermal, req.query);

  const { status, ...body } = response;
  return res.status(status).send(body);
});
