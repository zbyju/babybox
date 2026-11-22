import express from "express";
import * as http from "http";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { tcpPort } from "../../../test/tcpPort.js";
import { Action, Unit } from "../../types/units.types.js";

/*
 * Drives the real axios and socket path against a local HTTP server, so it
 * fails if the unit gate is dropped from fetchFromUnits. The helper tests
 * cannot show that: they still pass with every gate call removed.
 */
describe("fetchFromUnits.ts against a real server", () => {
  const RESPONSE_DELAY = 50;

  let server: http.Server;
  let inFlight = 0;
  let maxInFlight = 0;
  let requests = 0;
  let payload = "0|1|2";
  let apiServer: http.Server;
  let apiUrl: string;
  let unitApi: typeof import("../fetchFromUnits.js");

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      requests += 1;
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);

      setTimeout(() => {
        inFlight -= 1;
        res.setHeader("Content-Type", "text/plain");
        res.end(payload);
      }, RESPONSE_DELAY);
    });

    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    const port = tcpPort(server);

    /*
     * Both units point at the same server, so a second connection is visible
     * whichever unit opened it.
     */
    vi.resetModules();
    vi.doMock("../../index.js", () => ({
      config: {
        units: {
          engine: { ip: `127.0.0.1:${port}` },
          thermal: { ip: `127.0.0.1:${port}` },
        },
      },
    }));
    unitApi = await import("../fetchFromUnits.js");
    const app = express();
    app.set("query parser", "extended");
    app.use(express.json());
    app.use("/engine", (await import("../../routes/engineRoute.js")).router);
    app.use("/thermal", (await import("../../routes/thermalRoute.js")).router);
    app.use("/units", (await import("../../routes/unitsRoute.js")).router);
    apiServer = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => apiServer.once("listening", resolve));
    apiUrl = "http://127.0.0.1:" + tcpPort(apiServer);
  });

  afterAll(async () => {
    apiServer.closeAllConnections();
    await new Promise<void>((resolve) => apiServer.close(() => resolve()));
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    inFlight = 0;
    maxInFlight = 0;
    requests = 0;
    payload = "0|1|2";
  });

  it.each(["engine", "thermal"])(
    "serves validated %s data and rejects empty replies",
    async (unit) => {
      const url = apiUrl + "/" + unit + "/data";
      const success = await fetch(url);
      expect(success.status).toBe(200);
      expect(await success.json()).toEqual({
        msg: "Data fetched successfully.",
        data: "0|1|2",
      });

      payload = "";
      const failure = await fetch(url);
      expect(failure.status).toBe(408);
      expect(await failure.json()).toEqual({
        msg: "Request timedout. The URL/IP might be wrong, check the config.",
      });
    }
  );

  it.each(["unit=", "unit=engine&unit=thermal", "unit%5Bwhich%5D=engine"])(
    "rejects the HTTP query %s",
    async (query) => {
      const response = await fetch(apiUrl + "/units/settings?" + query);
      expect(response.status).toBe(400);
      expect(requests).toBe(0);
    }
  );

  it("preserves one-unit reads and defaults a repeated timeout", async () => {
    const response = await fetch(
      apiUrl + "/units/settings?unit=engine&timeout=1&timeout=1"
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: { engine: "0|1|2", thermal: null },
    });
    expect(requests).toBe(1);
  });

  it("preserves the settings body acceptance and rejection envelopes", async () => {
    const send = (body: unknown) =>
      fetch(apiUrl + "/units/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    const success = await send({ settings: [], options: { timeout: "bad" } });
    expect(success.status).toBe(200);
    expect(await success.json()).toEqual({
      msg: "All setting changes have been applied.",
      results: [],
    });
    const failure = await send({
      settings: [{ unit: "engine", index: 100.5, value: 1 }],
    });
    expect(failure.status).toBe(400);
    expect(await failure.json()).toEqual({
      msg: "The body needs to be an array of settings ({index: number, value: number, unit: 'engine' | 'thermal'}).",
    });
  });

  it("should never open two connections to one unit at the same time", async () => {
    const results = await Promise.all([
      unitApi.fetchDataCommon(Unit.Engine, { timeout: 2000 }),
      unitApi.fetchAction(Action.OpenDoors),
      unitApi.updateWatchdog(),
    ]);

    expect(maxInFlight).toBe(1);
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
  });

  it("should let two callers of the same read share one request", async () => {
    const [a, b] = await Promise.all([
      unitApi.fetchDataCommon(Unit.Engine, { timeout: 2000 }),
      unitApi.fetchDataCommon(Unit.Engine, { timeout: 2000 }),
    ]);

    expect(requests).toBe(1);
    expect(a.data).toBe("0|1|2");
    expect(b.data).toBe(a.data);
  });

  it("should talk to the two units at the same time", async () => {
    await Promise.all([
      unitApi.fetchDataCommon(Unit.Engine, { timeout: 2000 }),
      unitApi.fetchDataCommon(Unit.Thermal, { timeout: 2000 }),
    ]);

    expect(requests).toBe(2);
    expect(maxInFlight).toBe(2);
  });

  /*
   * The server never answers the readiness read with 0, so every attempt fails
   * and the loop retries until one of the two caps stops it.
   */
  it("should stop retrying a setting once the time budget runs out", async () => {
    const setting = { index: 100, value: 1, unit: Unit.Engine };

    const results = await unitApi.updateSettings([setting], 2000, 10, 200);

    const result = results[0];
    if (result === undefined) {
      throw new Error("updateSettings returned no result");
    }
    expect(result.result).toBe(false);
    expect(requests).toBeLessThan(10);
  });

  it("should still stop at tryNumber when the budget is wide", async () => {
    const setting = { index: 100, value: 1, unit: Unit.Engine };

    await unitApi.updateSettings([setting], 2000, 2, 60000);

    expect(requests).toBe(2);
  });
});

/*
 * A unit that answers the readiness read, so `updateSetting` runs its whole
 * sequence. The other server always answers "0|1|2", which never reads as
 * ready, so every attempt there returns before the first write.
 */
describe("updateSettings against a unit that is ready", () => {
  const INDEX = 100;
  const VALUE = 7;

  let server: http.Server;
  let unitApi: typeof import("../fetchFromUnits.js");
  let order: string[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  let stored: number | undefined;
  let reportWrongValue = false;
  let verifyAsJson = false;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const url = req.url ?? "";
      order.push(url);
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      inFlight -= 1;

      const json = (body: string) => {
        res.setHeader("Content-Type", "application/json");
        res.end(body);
      };

      // Ready to accept a write.
      if (url.startsWith("/get_sys[141]")) return json("0");

      const value = url.match(/sys140=(\d+)/);
      const written = value?.[1];
      if (written !== undefined) {
        stored = Number(written);
        return json(written);
      }

      const index = url.match(/sys141=(\d+)/);
      const selected = index?.[1];
      if (selected !== undefined) return json(selected);

      // Verification read. Slot 0 is setting index 100.
      if (url.startsWith("/get_sys[100]")) {
        if (verifyAsJson) return json(String(stored ?? 0));
        res.setHeader("Content-Type", "text/plain");
        const slot = reportWrongValue ? (stored ?? 0) + 1 : (stored ?? 0);
        return res.end(`${slot}|0|0`);
      }

      res.statusCode = 404;
      return res.end();
    });

    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    const port = tcpPort(server);

    vi.resetModules();
    vi.doMock("../../index.js", () => ({
      config: {
        units: {
          engine: { ip: `127.0.0.1:${port}` },
          thermal: { ip: `127.0.0.1:${port}` },
        },
      },
    }));
    unitApi = await import("../fetchFromUnits.js");
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    order = [];
    inFlight = 0;
    maxInFlight = 0;
    stored = undefined;
    reportWrongValue = false;
    verifyAsJson = false;
  });

  it("should write the value, then the index, then verify", async () => {
    const results = await unitApi.updateSettings([
      { index: INDEX, value: VALUE, unit: Unit.Engine },
    ]);

    expect(results).toEqual([
      { index: INDEX, value: VALUE, unit: Unit.Engine, result: true },
    ]);

    const steps = [
      order.findIndex((u) => u.startsWith("/get_sys[141]")),
      order.findIndex((u) => u.includes(`sys140=${VALUE}`)),
      order.findIndex((u) => u.includes(`sys141=${INDEX}`)),
      order.findIndex((u) => u.startsWith("/get_sys[100]")),
    ];

    expect(steps).toEqual([0, 1, 2, 3]);
    expect(order).toHaveLength(4);
  });

  it("should keep the four requests of one attempt to one at a time", async () => {
    await unitApi.updateSettings([
      { index: INDEX, value: VALUE, unit: Unit.Engine },
    ]);

    expect(maxInFlight).toBe(1);
  });

  it("should fail the setting when the verification read disagrees", async () => {
    reportWrongValue = true;

    const results = await unitApi.updateSettings(
      [{ index: INDEX, value: VALUE, unit: Unit.Engine }],
      5000,
      1
    );

    const result = results[0];
    if (result === undefined) {
      throw new Error("updateSettings returned no result");
    }
    expect(result.result).toBe(false);
  });

  it("should fail the setting when the verification read is not text", async () => {
    verifyAsJson = true;

    const results = await unitApi.updateSettings(
      [{ index: INDEX, value: VALUE, unit: Unit.Engine }],
      5000,
      1
    );

    expect(order.some((u) => u.startsWith("/get_sys[100]"))).toBe(true);
    const result = results[0];
    if (result === undefined) {
      throw new Error("updateSettings returned no result");
    }
    expect(result.result).toBe(false);
  });
});
