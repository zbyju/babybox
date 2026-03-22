import express, { Request, Response, Router } from "express";

import { getConfig } from "../state/config";
import { successResponse } from "../utils/response";

export const router: Router = express.Router();

const startedAt = Date.now();

router.get("/", async (_req: Request, res: Response) => {
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
      environment: process.env['NODE_ENV'] ?? "unknown",
    })
  );
});
