import moment = require("moment");

import { getTimeDifferenceInSeconds } from "../time";

describe("time.ts", () => {
  describe("getTimeDifferenceInSeconds", () => {
    it("should return the absolute difference in seconds for two valid moments", () => {
      const t1 = moment("2022-01-01T00:00:00");
      const t2 = moment("2022-01-01T00:01:30");

      expect(getTimeDifferenceInSeconds(t1, t2)).toBe(90);
      expect(getTimeDifferenceInSeconds(t2, t1)).toBe(90);
    });

    it("should return the max safe integer for an invalid t2", () => {
      const t1 = moment("2022-01-01T00:00:00");
      const t2 = moment.invalid();

      expect(getTimeDifferenceInSeconds(t1, t2)).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should return the max safe integer for an invalid t1", () => {
      const t1 = moment.invalid();
      const t2 = moment("2022-01-01T00:00:00");

      expect(getTimeDifferenceInSeconds(t1, t2)).toBe(Number.MAX_SAFE_INTEGER);
    });

    it("should return the max safe integer for null or undefined inputs", () => {
      const t = moment("2022-01-01T00:00:00");

      expect(getTimeDifferenceInSeconds(null, t)).toBe(Number.MAX_SAFE_INTEGER);
      expect(getTimeDifferenceInSeconds(t, null)).toBe(Number.MAX_SAFE_INTEGER);
      expect(getTimeDifferenceInSeconds(undefined, t)).toBe(
        Number.MAX_SAFE_INTEGER
      );
      expect(getTimeDifferenceInSeconds(t, undefined)).toBe(
        Number.MAX_SAFE_INTEGER
      );
      expect(getTimeDifferenceInSeconds(null, null)).toBe(
        Number.MAX_SAFE_INTEGER
      );
    });
  });
});
