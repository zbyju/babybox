import {
  getCurrentTimePC,
  getHoursWithLeadingZeroes,
  getMinutesWithLeadingZeroes,
} from "@/utils/time";
import moment from "moment";

describe("getCurrentTimePC function", () => {
  test("Should return time that is now", () => {
    expect(getCurrentTimePC().diff(Date.now(), "seconds")).toBeLessThan(5);
    expect(getCurrentTimePC()).toBeInstanceOf(moment);
  });
});

describe("getHoursWithLeadingZeroes function", () => {
  test("Should return time as is when valid and 2 digits", () => {
    expect(getHoursWithLeadingZeroes(moment().hours(12))).toBe("12");
    expect(
      getHoursWithLeadingZeroes(moment().hours(12).minutes(23).seconds(39))
    ).toBe("12");
    expect(
      getHoursWithLeadingZeroes(
        moment().hours(23).minutes(59).seconds(59).milliseconds(999)
      )
    ).toBe("23");
  });

  test("Should add leading zeroes when missing", () => {
    expect(getHoursWithLeadingZeroes(moment().hours(2))).toBe("02");
    expect(getHoursWithLeadingZeroes(moment().hours(0))).toBe("00");
    expect(getHoursWithLeadingZeroes(moment().hours(24))).toBe("00");
    expect(
      getHoursWithLeadingZeroes(
        moment().hours(9).minutes(59).seconds(59).milliseconds(999)
      )
    ).toBe("09");
    expect(
      getHoursWithLeadingZeroes(moment().hours(2).minutes(23).seconds(39))
    ).toBe("02");
  });

  test("Should return -- when time is not valid", () => {
    expect(getHoursWithLeadingZeroes(null)).toBe("--");
    expect(getHoursWithLeadingZeroes(undefined)).toBe("--");
  });
});

describe("getMinutesWithLeadingZeroes function", () => {
  test("Should return time as is when valid and 2 digits", () => {
    expect(getMinutesWithLeadingZeroes(moment().minutes(12))).toBe("12");
    expect(
      getMinutesWithLeadingZeroes(moment().hours(12).minutes(23).seconds(39))
    ).toBe("23");
    expect(
      getMinutesWithLeadingZeroes(
        moment().hours(23).minutes(59).seconds(59).milliseconds(999)
      )
    ).toBe("59");
  });

  test("Should add leading zeroes when missing", () => {
    expect(getMinutesWithLeadingZeroes(moment().minutes(2))).toBe("02");
    expect(getMinutesWithLeadingZeroes(moment().minutes(0))).toBe("00");
    expect(getMinutesWithLeadingZeroes(moment().minutes(60))).toBe("00");
    expect(
      getHoursWithLeadingZeroes(
        moment().hours(9).minutes(9).seconds(59).milliseconds(999)
      )
    ).toBe("09");
    expect(
      getHoursWithLeadingZeroes(moment().hours(2).minutes(2).seconds(39))
    ).toBe("02");
  });

  test("Should return -- when time is not valid", () => {
    expect(getHoursWithLeadingZeroes(null)).toBe("--");
    expect(getHoursWithLeadingZeroes(undefined)).toBe("--");
    expect(getHoursWithLeadingZeroes(moment([2015, 25, 35]))).toBe("--");
  });
});
