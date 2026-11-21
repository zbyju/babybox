import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/base", () => ({ backendApi: vi.fn() }));
vi.mock("@/api/http", () => ({ request: vi.fn(), requestJson: vi.fn() }));

import { requestJson } from "@/api/http";
import { getData } from "@/api/units";

const requestJsonMock = vi.mocked(requestJson);

const URL = "http://localhost:5000/api/v1/engine/data";

describe("getData", () => {
  beforeEach(() => {
    requestJsonMock.mockReset();
  });

  it("splits the unit answer into indexed values", async () => {
    requestJsonMock.mockResolvedValue({ status: 200, data: { data: "12|0" } });

    expect(await getData(URL)).toEqual([
      { index: 0, value: "12" },
      { index: 1, value: "0" },
    ]);
  });

  /* The panel loop counts the rejection as a failed request. */
  it.each([[{}], [{ data: 12 }], [{ data: null }], ["12|0"], [null]])(
    "rejects when the 200 body is %p",
    async (data) => {
      requestJsonMock.mockResolvedValue({ status: 200, data });

      await expect(getData(URL)).rejects.toBeUndefined();
    },
  );
});
