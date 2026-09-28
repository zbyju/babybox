import express from "express";
import * as http from "http";
import type { AddressInfo } from "net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { jsonErrors } from "../middleware/jsonErrors.js";

/*
 * Express 4 dropped a rejected promise from an async handler on the floor, so
 * the request hung until it timed out. Express 5 sends it here instead. The
 * panel reads every answer as JSON, so the built-in HTML page is not usable.
 */
describe("the json error middleware", () => {
  let server: http.Server;
  let url: string;

  beforeAll(async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const app = express();
    app.get("/throws", () => {
      throw new Error("sync boom");
    });
    app.get("/rejects", async () => {
      await Promise.resolve();
      throw new Error("async boom");
    });
    app.get("/not-an-error", () => {
      throw "just a string";
    });
    app.get("/sent-already", (_req, res) => {
      res.status(200).json({ ok: true });
      throw new Error("too late");
    });
    app.post("/parsed", express.json(), (_req, res) => {
      res.json({ ok: true });
    });
    app.use(jsonErrors);

    server = app.listen(0);
    await new Promise((done) => server.once("listening", done));
    url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    await new Promise((done) => server.close(done));
  });

  it("answers a thrown error with json, not html", async () => {
    const res = await fetch(`${url}/throws`);

    expect(res.status).toBe(500);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(await res.json()).toEqual({ error: "sync boom" });
  });

  it("answers a rejected async handler with json", async () => {
    const res = await fetch(`${url}/rejects`);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "async boom" });
  });

  it("answers when something other than an Error is thrown", async () => {
    const res = await fetch(`${url}/not-an-error`);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "just a string" });
  });

  it("leaves an answer that was already sent alone", async () => {
    const res = await fetch(`${url}/sent-already`);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  /*
   * express.json() puts 400 on the error it throws for a bad body. Answering
   * 500 there would call the sender's mistake ours, and Express 4 said 400.
   */
  it("keeps the 400 that express.json puts on a bad body", async () => {
    const res = await fetch(`${url}/parsed`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });

    expect(res.status).toBe(400);
    expect(res.headers.get("content-type")).toContain("application/json");
  });
});
