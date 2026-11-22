import express from "express";

import {
  fetchAction,
  fetchSettings,
  updateSettings,
} from "../fetch/fetchFromUnits.js";
import { settingsBodySchema } from "../types/request.types.js";
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
  const response = await fetchSettings(req.query);

  return res
    .status(response.status)
    .send({ msg: response.msg, data: response.data });
});

router.put("/settings", async (req, res) => {
  const parsed = settingsBodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).send({
      msg: "The body needs to be an array of settings ({index: number, value: number, unit: 'engine' | 'thermal'}).",
    });
  }

  const results = await updateSettings(
    parsed.data.settings,
    parsed.data.timeout
  );
  const response = results.every((r) => r.result)
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
