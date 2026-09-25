import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { Unit } from "../../types/units.types.js";
import { defaultFetchTimeout } from "../constants.js";

/*
 * Express passes `?timeout` as a string.
 * fetchFromUrl is mocked, so the test sees the timeout that would reach axios.
 */
describe("fetchDataCommon ?timeout", () => {
  const fetchFromUrl = vi.fn();
  let unitApi: typeof import("../fetchFromUnits.js");

  beforeAll(async () => {
    vi.resetModules();
    vi.doMock("../../index.js", () => ({
      config: {
        units: { engine: { ip: "10.1.1.5" }, thermal: { ip: "10.1.1.6" } },
      },
    }));
    vi.doMock("../fetch.js", () => ({ fetchFromUrl }));
    unitApi = await import("../fetchFromUnits.js");
  });

  beforeEach(() => {
    fetchFromUrl.mockReset();
    fetchFromUrl.mockResolvedValue({ status: 200, data: "0|1|2" });
  });

  it.each([["abc"], ["0.5"], ["0"], ["2147483648"]])(
    "should use the default for ?timeout=%s",
    async (timeout) => {
      await unitApi.fetchDataCommon(Unit.Engine, { timeout });

      expect(fetchFromUrl).toHaveBeenCalledWith(
        expect.any(String),
        defaultFetchTimeout()
      );
    }
  );

  it("should use the default when there is no ?timeout", async () => {
    await unitApi.fetchDataCommon(Unit.Engine, {});

    expect(fetchFromUrl).toHaveBeenCalledWith(
      expect.any(String),
      defaultFetchTimeout()
    );
  });

  it.each([
    ["2000", 2000],
    ["2147483647", 2147483647],
  ])("should use ?timeout=%s as it is", async (timeout, expected) => {
    await unitApi.fetchDataCommon(Unit.Engine, { timeout });

    expect(fetchFromUrl).toHaveBeenCalledWith(expect.any(String), expected);
  });
});
