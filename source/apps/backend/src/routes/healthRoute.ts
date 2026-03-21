import express, { Request, Response, Router } from "express";

import { getConfig } from "../state/config.js";
import { successResponse } from "../utils/response.js";

export const router: Router = express.Router();

const startedAt = Date.now();

router.get("/", async (req: Request, res: Response) => {
  const config = getConfig();
  const uptimeMs = Date.now() - startedAt;

  return res.status(200).json(
    successResponse({
      status: "ok",
      uptimeMs,
      uptimeSeconds: Math.floor(uptimeMs / 1000),
      config: {
        babyboxName: config.babybox.name,
        engineIp: config.units.engine.ip,
        thermalIp: config.units.thermal.ip,
        cameraIp: config.camera.ip,
        cameraType: config.camera.cameraType,
        backendPort: config.backend.port,
      },
      environment: process.env.NODE_ENV ?? "unknown",
    })
  );
});
