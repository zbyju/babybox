import express from "express";

import {
  fetchAction,
  fetchSettings,
  updateSettings,
} from "../fetch/fetchFromUnits.js";
import type {
  CommonSettingsResponse,
  SettingResult,
} from "../types/request.types.js";
import {
  settingsBodySchema,
  settingsQuerySchema,
} from "../types/request.types.js";
import { stringToAction } from "../utils/actions.js";

export const router = express.Router();

router.get("/actions/:action", async (req, res) => {
  const action = stringToAction(req.params.action);

  if (action === undefined) {
    return res.status(400).send({ msg: "Unknown action" });
  }

  const response = await fetchAction(action);
  return res.status(response.status).send({ msg: response.msg });
});

router.get("/settings", async (req, res) => {
  const query = settingsQuerySchema.safeParse(req.query);
  if (!query.success) {
    return res.status(400).send({
      msg: "Unit was specified, but it is wrong. Expected values are: 'engine' or 'thermal'.",
    });
  }
  const response = await fetchSettings(query.data);

  return res
    .status(response.status)
    .send({ msg: response.msg, data: response.data });
});

router.put("/settings", async (req, res) => {
  const body = settingsBodySchema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).send({
      msg: "The body needs to be an array of settings ({index: number, value: number, unit: 'engine' | 'thermal'}).",
    });
  }

  const results: SettingResult[] = await updateSettings(
    body.data.settings,
    body.data.options.timeout
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
    .send({ msg: response.msg, results: response.results });
});
