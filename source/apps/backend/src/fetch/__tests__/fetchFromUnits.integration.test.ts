import * as http from "http";
import type { AddressInfo } from "net";

import { Action, Unit } from "../../types/units.types";

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
  let unitApi: typeof import("../fetchFromUnits");

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      requests += 1;
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);

      setTimeout(() => {
        inFlight -= 1;
        res.setHeader("Content-Type", "text/plain");
        res.end("0|1|2");
      }, RESPONSE_DELAY);
    });

    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    const { port } = server.address() as AddressInfo;

    /*
     * Both units point at the same server, so a second connection is visible
     * whichever unit opened it.
     */
    jest.resetModules();
    jest.doMock("../..", () => ({
      config: {
        units: {
          engine: { ip: `127.0.0.1:${port}` },
          thermal: { ip: `127.0.0.1:${port}` },
        },
      },
    }));
    unitApi = require("../fetchFromUnits");
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    inFlight = 0;
    maxInFlight = 0;
    requests = 0;
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

    expect(results[0].result).toBe(false);
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
  let unitApi: typeof import("../fetchFromUnits");
  let order: string[] = [];
  let inFlight = 0;
  let maxInFlight = 0;
  let stored: number | undefined;
  let reportWrongValue = false;

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
      if (value !== null) {
        stored = Number(value[1]);
        return json(value[1]);
      }

      const index = url.match(/sys141=(\d+)/);
      if (index !== null) return json(index[1]);

      // Verification read. Slot 0 is setting index 100.
      if (url.startsWith("/get_sys[100]")) {
        res.setHeader("Content-Type", "text/plain");
        const slot = reportWrongValue ? (stored ?? 0) + 1 : stored ?? 0;
        return res.end(`${slot}|0|0`);
      }

      res.statusCode = 404;
      return res.end();
    });

    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve)
    );
    const { port } = server.address() as AddressInfo;

    jest.resetModules();
    jest.doMock("../..", () => ({
      config: {
        units: {
          engine: { ip: `127.0.0.1:${port}` },
          thermal: { ip: `127.0.0.1:${port}` },
        },
      },
    }));
    unitApi = require("../fetchFromUnits");
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

    expect(results[0].result).toBe(false);
  });
});
