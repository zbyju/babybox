import axios from "axios";
import * as express from "express";
import * as http from "http";
import type { AddressInfo } from "net";

import type { MainConfig } from "../../types/config.types";

function storedConfig(): MainConfig {
  return {
    babybox: { name: "Praha" },
    backend: { url: "/api/v1", port: 5000, requestTimeout: 5000 },
    configer: { url: "/api/v1", port: 5001, requestTimeout: 5000 },
    units: {
      engine: { ip: "10.1.1.50" },
      thermal: { ip: "10.1.1.51" },
      requestDelay: 1000,
      warningThreshold: 3,
      errorThreshold: 10,
      voltage: { divider: 63, multiplier: 1, addition: 0 },
    },
    camera: {
      ip: "10.1.1.60",
      username: "admin",
      password: "secret",
      updateDelay: 1000,
      cameraType: "dahua",
    },
    pc: { os: "windows" },
    app: { password: "pass" },
    startup: {},
  };
}

const applyConfig = jest.fn();
const fetchConfig = jest.fn();

/*
 * The route reads `bound` and calls `applyConfig` on index.ts, which starts the
 * whole backend when it is imported, so it is mocked. fetchConfig is mocked too:
 * every case here is about what the route does with the answer.
 */
async function startRoute(bound: unknown) {
  jest.resetModules();
  jest.doMock("../..", () => ({ applyConfig, bound }));
  jest.doMock("../../fetch/fetchConfig", () => ({ fetchConfig }));

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { router } = require("../reloadRoute");

  const app = express();
  app.use("/api/v1/reload", router);
  const server = http.createServer(app);

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${port}/api/v1/reload` };
}

async function stopRoute(server: http.Server) {
  // Node 18 keeps an idle socket open, so close() alone never calls back.
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

const post = (url: string) =>
  axios.post(url, {}, { validateStatus: () => true });

describe("POST /reload", () => {
  let server: http.Server;
  let url: string;

  beforeAll(async () => {
    ({ server, url } = await startRoute({ port: 5000, prefix: "/api/v1" }));
  });

  afterAll(() => stopRoute(server));

  beforeEach(() => {
    applyConfig.mockClear();
    fetchConfig.mockReset();
  });

  it("swaps in the new config and reports nothing unapplied", async () => {
    const config = storedConfig();
    config.units.engine.ip = "10.1.1.99";
    fetchConfig.mockResolvedValue({ status: 200, data: config });

    const response = await post(url);

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ msg: "Ok", unapplied: [] });
    expect(applyConfig).toHaveBeenCalledWith(config);
  });

  it("keeps the old config when configer does not answer", async () => {
    fetchConfig.mockResolvedValue({ status: 408, msg: "Request timedout." });

    const response = await post(url);

    expect(response.status).toBe(503);
    expect(applyConfig).not.toHaveBeenCalled();
  });

  it("keeps the old config when the stored one lost a field the backend reads", async () => {
    const config = storedConfig();
    delete (config.units.engine as Partial<MainConfig["units"]["engine"]>).ip;
    fetchConfig.mockResolvedValue({ status: 200, data: config });

    const response = await post(url);

    expect(response.status).toBe(503);
    expect(response.data.msg).toBe(
      "the stored config is missing a field the backend reads"
    );
    expect(applyConfig).not.toHaveBeenCalled();
  });

  it("names the address it bound at listen and cannot change", async () => {
    const config = storedConfig();
    config.backend.port = 5050;
    fetchConfig.mockResolvedValue({ status: 200, data: config });

    const response = await post(url);

    expect(response.status).toBe(200);
    expect(response.data.unapplied).toEqual([
      { path: "backend.port", running: 5000, stored: 5050 },
    ]);
    expect(applyConfig).toHaveBeenCalledWith(config);
  });
});

/*
 * `bound` is null from import until app.listen. A reload in that window has nothing
 * to compare the stored address against, so it must not swap anything in.
 */
describe("POST /reload before the server listens", () => {
  let server: http.Server;
  let url: string;

  beforeAll(async () => {
    applyConfig.mockClear();
    fetchConfig.mockReset();
    ({ server, url } = await startRoute(null));
  });

  afterAll(() => stopRoute(server));

  it("answers 503 and does not read the config at all", async () => {
    const response = await post(url);

    expect(response.status).toBe(503);
    expect(response.data).toEqual({ msg: "Not listening yet." });
    expect(fetchConfig).not.toHaveBeenCalled();
    expect(applyConfig).not.toHaveBeenCalled();
  });
});
