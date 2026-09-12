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

function base(): Record<string, unknown> {
  return JSON.parse(
    readFileSync(join(defaultConfigDir, "base.json"), "utf-8")
  ) as Record<string, unknown>;
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

async function put(body: unknown): Promise<{ status: number; body: unknown }> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "content-type": "application/json", connection: "close" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
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

    const get = await fetch(url, { headers: { connection: "close" } });
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
