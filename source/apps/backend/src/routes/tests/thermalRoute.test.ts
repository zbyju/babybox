import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import express from "express";
import { setConfig } from "../../state/config";
import type { MainConfig } from "../../types/config.types";

// Mock the fetch module
vi.mock("../../fetch/fetch-from-units", () => ({
  fetchDataCommon: vi.fn(),
  updateWatchdog: vi.fn(),
}));

import { fetchDataCommon } from "../../fetch/fetch-from-units";
import { router } from "../thermal-route";

const mockFetchDataCommon = vi.mocked(fetchDataCommon);

const mockConfig: MainConfig = {
  babybox: { name: "Test Babybox" },
  backend: { url: "/api/v1", port: 3000, requestTimeout: 5000 },
  configer: { url: "/api/v1", port: 3001, requestTimeout: 5000 },
  startup: {},
  units: {
    engine: { ip: "10.1.1.5" },
    thermal: { ip: "10.1.1.6" },
    requestDelay: 2000,
    warningThreshold: 3,
    errorThreshold: 5,
    voltage: { divider: 63, multiplier: 100, addition: 0 },
  },
  camera: {
    ip: "10.1.1.7",
    username: "admin",
    password: "admin",
    updateDelay: 1000,
    cameraType: "dahua",
  },
  pc: { os: "ubuntu" },
  app: { password: "test123" },
};

async function makeRequest(
  app: express.Application,
  method: string,
  path: string,
): Promise<{ status: number; body: unknown }> {
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;

  try {
    const response = await fetch(`http://localhost:${port}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
    });
    const responseBody = await response.json();
    return { status: response.status, body: responseBody };
  } finally {
    server.close();
  }
}

describe("Thermal Route", () => {
  let app: express.Application;

  beforeAll(() => {
    setConfig(mockConfig);
    app = express();
    app.use(express.json());
    app.use("/api/v1/thermal", router);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /data", () => {
    it("should return 200 with thermal data on success", async () => {
      mockFetchDataCommon.mockResolvedValueOnce({
        status: 200,
        msg: "Data fetched successfully.",
        data: "25|26|27",
      });

      const { status, body } = await makeRequest(app, "GET", "/api/v1/thermal/data");

      expect(status).toBe(200);
      expect(body).toMatchObject({ success: true, data: "25|26|27" });
    });

    it("should return error status on hardware failure", async () => {
      mockFetchDataCommon.mockResolvedValueOnce({
        status: 408,
        msg: "Request timedout.",
      });

      const { status, body } = await makeRequest(app, "GET", "/api/v1/thermal/data");

      expect(status).toBe(408);
      expect(body).toMatchObject({ success: false });
    });
  });
});
