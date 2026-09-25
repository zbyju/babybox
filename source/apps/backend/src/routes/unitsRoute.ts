import express from "express";

import {
  fetchAction,
  fetchSettings,
  updateSettings,
} from "../fetch/fetchFromUnits.js";
import {
  CommonSettingsResponse,
  isInstanceOfPostUnitSettingsRequestBody,
  SettingResult,
} from "../types/request.types.js";
import { stringToAction } from "../utils/actions.js";

export const router = express.Router();

const DEFAULT_SETTING_TIMEOUT = 5000;

/*
 * The client picks the timeout, and one settings attempt is four sequential
 * requests at that value. The unit queue drops a job after 60 s, so an
 * uncapped number makes every attempt die on the deadline instead of on the
 * unit.
 */
const MAX_SETTING_TIMEOUT = 10000;

function settingTimeout(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_SETTING_TIMEOUT;
  }
  return Math.min(raw, MAX_SETTING_TIMEOUT);
}

router.get("/actions/:action", async (req, res) => {
  const action = stringToAction(req.params.action);

  if (action === undefined) {
    return res.status(400).send({ msg: "Unknown action" });
  }

  const response = await fetchAction(action);
  return res.status(response.status).send({ msg: response.msg });
});

router.get("/settings", async (req, res) => {
  const response = await fetchSettings(req.query);

  return res
    .status(response.status)
    .send({ msg: response.msg, data: response.data });
});

router.put("/settings", async (req, res) => {
  if (!isInstanceOfPostUnitSettingsRequestBody(req.body)) {
    return res.status(400).send({
      msg: "The body needs to be an array of settings ({index: number, value: number, unit: 'engine' | 'thermal'}).",
    });
  }

  const results: SettingResult[] = await updateSettings(
    req.body.settings,
    settingTimeout(req.body.options?.timeout)
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
