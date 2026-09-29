import axios from "axios";
import express from "express";
import * as http from "http";
import type { AddressInfo } from "net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const transformThermalData = vi.fn((data: unknown) => ({ thermal: data }));
const fetchDataCommon = vi.fn(async () => ({
  status: 200,
  msg: "Data fetched successfully.",
  data: "1|2|3",
}));

describe("GET /engine/data", () => {
  let server: http.Server;
  let url: string;

  beforeAll(async () => {
    vi.resetModules();
    vi.doMock("../../utils/transformData.js", () => ({
      transformThermalData,
    }));
    vi.doMock("../../fetch/fetchFromUnits.js", () => ({
      fetchDataCommon,
      updateWatchdog: vi.fn(),
    }));

    const { router } = await import("../engineRoute.js");
    const app = express();
    app.use("/engine", router);
    server = http.createServer(app);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    const address = server.address() as AddressInfo;
    url = `http://127.0.0.1:${address.port}/engine/data`;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("sends the engine payload without the thermal transform", async () => {
    const response = await axios.get(url, { validateStatus: () => true });

    expect(response.status).toBe(200);
    expect(response.data).toEqual({
      msg: "Data fetched successfully.",
      data: "1|2|3",
    });
    expect(transformThermalData).not.toHaveBeenCalled();
  });
});
