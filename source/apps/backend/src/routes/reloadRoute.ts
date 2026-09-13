import * as express from "express";
import { Request, Response } from "express";

import { applyConfig, bound } from "..";
import { fetchConfig } from "../fetch/fetchConfig";
import { reloadConfig } from "../modules/configReload";

export const router = express.Router();

/*
 * Reads the config from configer again and swaps it into the running process. The
 * config page calls it after a save, so the unit IPs and pc.os take effect without
 * a restart.
 *
 * On any failure the running config is left exactly as it was and the answer is a
 * 503. A backend that swapped in a broken config would throw on its next poll and
 * take the panel down with it, which needs someone on site.
 *
 * 200 carries `unapplied`: the fields the reload read but a listening process
 * cannot change. Only `backend.port` and `backend.url` can be in it.
 */
router.post("/", async (req: Request, res: Response) => {
  if (bound === null) {
    res.status(503).send({ msg: "Not listening yet." });
    return;
  }

  const result = await reloadConfig(fetchConfig, bound);
  if (result.status === "failed") {
    console.error(`Config reload failed, keeping the old config: ${result.msg}`);
    res.status(503).send({ msg: result.msg });
    return;
  }

  applyConfig(result.config);
  res.status(200).send({ msg: "Ok", unapplied: result.unapplied });
});
