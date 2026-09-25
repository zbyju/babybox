import axios from "axios";
import express from "express";
import * as fs from "fs";
import * as http from "http";
import type { AddressInfo } from "net";
import * as os from "os";
import * as path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/*
 * The production block of index.ts, rebuilt here. Importing index.ts for real runs
 * main() and starts the whole backend, so the routes it registers are mirrored
 * instead — an API route first, then the static dir and the SPA fallback.
 */
describe("the panel fallback in production", () => {
  let server: http.Server;
  let url: string;
  let publicDir: string;

  const INDEX_HTML = "<!doctype html><title>panel</title>";

  beforeAll(async () => {
    publicDir = fs.mkdtempSync(path.join(os.tmpdir(), "panel-public-"));
    fs.writeFileSync(path.join(publicDir, "index.html"), INDEX_HTML);

    const app = express();

    app.get("/api/v1/status", (req, res) => {
      res.status(200).send({ msg: "Alive." });
    });

    app.use(express.static(publicDir));

    app.get("/", (req, res) => {
      res.sendFile(path.join(publicDir, "index.html"), {
        headers: { "Cache-Control": "no-cache" },
      });
    });

    app.get("*", (req, res) => {
      res.sendFile(path.join(publicDir, "index.html"), {
        headers: { "Cache-Control": "no-cache" },
      });
    });

    server = http.createServer(app);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    const { port } = server.address() as AddressInfo;
    url = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    // Node 18 keeps an idle socket open, so close() alone never calls back.
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(publicDir, { recursive: true, force: true });
  });

  const get = (path: string) =>
    axios.get(`${url}${path}`, { validateStatus: () => true });

  it("serves the panel for a hard load of a client route", async () => {
    const response = await get("/config");

    expect(response.status).toBe(200);
    expect(response.data).toBe(INDEX_HTML);
  });

  it("revalidates the served index.html on every load", async () => {
    const response = await get("/config");

    expect(response.headers["cache-control"]).toBe("no-cache");
  });

  it("still serves the panel at the root", async () => {
    const response = await get("/");

    expect(response.data).toBe(INDEX_HTML);
  });

  /* The fallback is registered last, so it must not swallow an API path. */
  it("leaves an API route mounted before it alone", async () => {
    const response = await get("/api/v1/status");

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ msg: "Alive." });
  });
});
