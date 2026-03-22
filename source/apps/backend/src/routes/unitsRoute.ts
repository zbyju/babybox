import express, { Router } from "express";

import {
  fetchAction,
  fetchSettings,
  updateSettings,
} from "../fetch/fetchFromUnits";
import { validateBody, validateQuery } from "../middleware/validate";
import {
  PostUnitSettingsRequestBodySchema,
  GetUnitSettingsRequestSchema,
  type SettingResult,
  type CommonSettingsResponse,
  type PostUnitSettingsRequestBody,
} from "../schemas/request.schema";
import { stringToAction } from "../utils/actions";
import { successResponse, errorResponse } from "../utils/response";

export const router: Router = express.Router();

router.get("/actions/:action", async (req, res) => {
  const action = stringToAction(req.params.action);

  if (action === undefined) {
    return res.status(400).json(errorResponse("Unknown action", { action: req.params.action }));
  }

  const response = await fetchAction(action);
  if (response.status >= 400) {
    return res.status(response.status).json(errorResponse(response.msg));
  }
  return res.status(response.status).json(successResponse(response.data));
});

router.get(
  "/settings",
  validateQuery(GetUnitSettingsRequestSchema),
  async (req, res) => {
    const response = await fetchSettings(req.query);
    if (response.status >= 400) {
      return res.status(response.status).json(errorResponse(response.msg));
    }
    return res.status(response.status).json(successResponse(response.data));
  }
);

router.put(
  "/settings",
  validateBody(PostUnitSettingsRequestBodySchema),
  async (req, res) => {
    const body = req.body as PostUnitSettingsRequestBody;
    const results: SettingResult[] = await updateSettings(
      body.settings,
      body.options?.timeout ?? 5000
    );
    const response: CommonSettingsResponse = results.every((r) => r.result)
      ? {
          status: 200,
          msg: "All setting changes have been applied.",
          results,
        }
      : results.every((r) => !r.result)
      ? {
          status: 500,
          msg: "All setting changes failed.",
          results,
        }
      : {
          status: 206,
          msg: "Some setting changes failed, some were successful.",
          results,
        };
    return res
      .status(response.status)
      .json(successResponse({ msg: response.msg, results: response.results }));
  }
);
