import express, { Request, Response, Router } from "express";

import { fetchDataCommon } from "../fetch/fetchFromUnits.js";
import { Unit } from "../types/units.types.js";
import { successResponse, errorResponse } from "../utils/response.js";

export const router: Router = express.Router();

router.get("/data", async (req: Request, res: Response) => {
  const response = await fetchDataCommon(Unit.Thermal, req.query);

  if (response.status >= 400) {
    return res.status(response.status).json(errorResponse(response.msg));
  }
  return res.status(response.status).json(successResponse(response.data));
});
