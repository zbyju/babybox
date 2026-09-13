import {
  copyFileSync,
  fsyncSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { Server } from "node:http";
import { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MainConfig } from "@babybox/config-schema";
import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MainDb, defaultConfigDir, mainConfig } from "../services/db/main";
import { router } from "./configRoute";

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return { ...actual, fsyncSync: vi.fn(actual.fsyncSync) };
});

let db: MainDb;

vi.mock("../services/db/factory.js", () => ({
  DbFactory: { getMainDb: () => db },
}));

let configDir: string;
let server: Server;
let url: string;

function base(): MainConfig {
  return JSON.parse(
    readFileSync(join(defaultConfigDir, "base.json"), "utf-8")
  ) as MainConfig;
}

beforeEach(async () => {
  configDir = mkdtempSync(join(tmpdir(), "configer-route-"));
  copyFileSync(
    join(defaultConfigDir, "base.json"),
    join(configDir, "base.json")
  );
  db = mainConfig(configDir);

  const app = express();
  app.use(express.json());
  app.use("/config", router);
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  url = `http://127.0.0.1:${
    (server.address() as AddressInfo).port
  }/config/main`;
});

afterEach(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  rmSync(configDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

async function send(
  method: "PUT" | "PATCH",
  body: unknown,
  headers: Record<string, string> = { "content-type": "application/json" }
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
}

async function put(body: unknown): Promise<{ status: number; body: unknown }> {
  return send("PUT", body);
}

async function patch(
  body: unknown
): Promise<{ status: number; body: unknown }> {
  return send("PATCH", body);
}

describe("PUT /config/main", () => {
  it("answers 400 with the field errors for an invalid body", async () => {
    const res = await put({ units: { engine: { ip: 5 } } });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      msg: "Body is not a valid MainConfig",
      errors: [{ path: "units.engine.ip", msg: "must be a string" }],
    });
  });

  it("answers 200 with the saved config, which GET then returns", async () => {
    const res = await put({ babybox: { name: "Brno" } });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...base(), babybox: { name: "Brno" } });

    const get = await fetch(url);
    expect(await get.json()).toEqual(res.body);
  });

  it("answers 500 when the write fails", async () => {
    vi.mocked(fsyncSync).mockImplementationOnce(() => {
      throw new Error("no space left on device");
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const res = await put({ babybox: { name: "Brno" } });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      msg: "cannot write main.json: no space left on device",
    });
  });
});

describe("PATCH /config/main", () => {
  it("answers 400 with the field errors for an invalid body", async () => {
    const res = await patch({ camera: { cameraType: "foscam" } });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      msg: "Body is not a valid MainConfig",
      errors: [
        {
          path: "camera.cameraType",
          msg: "must be one of: dahua, hikvision, avtech, avm, vivotek",
        },
      ],
    });
  });

  /* express.json() leaves the body as {} when the header is missing, so the request
   * arrives looking like an empty one. Nothing may be written for it. */
  it("answers 400 when the Content-Type header is missing", async () => {
    const res = await send("PATCH", { babybox: { name: "Brno" } }, {});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      msg: "Body is not a valid MainConfig",
      errors: [{ path: "", msg: "must not be empty" }],
    });
  });

  it("answers 200 and leaves the keys the body does not name alone", async () => {
    await put({ camera: { ip: "10.1.1.99" } });

    const res = await patch({ babybox: { name: "Brno" } });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ...base(),
      babybox: { name: "Brno" },
      camera: { ...base().camera, ip: "10.1.1.99" },
    });

    const get = await fetch(url);
    expect(await get.json()).toEqual(res.body);
  });

  /* The one rejection that does not come from the schema. P3 shows its text in the
   * form, so it has to reach the client as it is written. */
  it("answers 400 for a change to the running configer address", async () => {
    const res = await patch({ configer: { port: 5555 } });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      msg: "Body is not a valid MainConfig",
      errors: [
        {
          path: "configer.port",
          msg: "must stay 5001: it changes only by editing main.json and restarting configer",
        },
      ],
    });
  });

  it("answers 500 when the write fails", async () => {
    vi.mocked(fsyncSync).mockImplementationOnce(() => {
      throw new Error("no space left on device");
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const res = await patch({ babybox: { name: "Brno" } });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      msg: "cannot write main.json: no space left on device",
    });
  });
});
