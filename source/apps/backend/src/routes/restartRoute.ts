import express from "express";

import { modules } from "../index.js";

export function restartRouter(checkIn: (peer: string | undefined) => void) {
  const router = express.Router();
  router.get("/refresh", (req, res) => {
    if (req.get("sec-fetch-dest") === "empty" || req.get("referer"))
      checkIn(req.socket.remoteAddress);
    modules.onIncomingData();
    res.set("Cache-Control", "no-store").status(200).send({ msg: "Ok" });
  });
  return router;
}
