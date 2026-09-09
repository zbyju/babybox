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

    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
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
});
