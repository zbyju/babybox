import {
  parseIntOrEmpty,
  prettyInt,
  prettyNumber,
  prettyTemperature,
  prettyTwoNumbers,
} from "@/utils/data";

describe("parseIntOrEmpty function", () => {
  test("Should return number when string is number", () => {
    expect(parseIntOrEmpty("1")).toEqual(1);
    expect(parseIntOrEmpty("5")).toEqual(5);
    expect(parseIntOrEmpty("1000000")).toEqual(1000000);
    expect(parseIntOrEmpty("-1")).toEqual(-1);
    expect(parseIntOrEmpty("0")).toEqual(0);
  });

  test("Should return number when string starts with a number", () => {
    expect(parseIntOrEmpty("1abc")).toEqual(1);
    expect(parseIntOrEmpty("5ABCD4")).toEqual(5);
  });

  test("Should throw exception when not a number", () => {
    expect(() => parseIntOrEmpty(null)).toThrow();
    expect(() => parseIntOrEmpty("")).toThrow();
    expect(() => parseIntOrEmpty("test")).toThrow();
  });

  test("Should throw exception when it is a string containing a number", () => {
    expect(() => parseIntOrEmpty("TEST1TEST")).toThrow();
    expect(() => parseIntOrEmpty("a123b")).toThrow();
  });
});

describe("prettyTemperature function", () => {
  test("Returns temperature / 100°C if string is number", () => {
    expect(prettyTemperature("1200")).toEqual("12.00°C");
    expect(prettyTemperature("1250")).toEqual("12.50°C");
    expect(prettyTemperature("0000")).toEqual("0.00°C");
    expect(prettyTemperature("123456")).toEqual("1234.56°C");
  });

  test("Returns empty string if any error", () => {
    expect(prettyTemperature(null)).toEqual("");
    expect(prettyTemperature(NaN.toString())).toEqual("");
    expect(prettyTemperature(undefined)).toEqual("");
    expect(prettyTemperature("abcd")).toEqual("");
    expect(prettyTemperature("ab1234cd")).toEqual("");
  });
});

describe("prettyInt function", () => {
  test("Returns whole number if string is a number", () => {
    expect(prettyInt(1)).toEqual("1");
    expect(prettyInt(0)).toEqual("0");
    expect(prettyInt(-1)).toEqual("-1");
    expect(prettyInt(25)).toEqual("25");
    expect(prettyInt(-25)).toEqual("-25");
    expect(prettyInt(5.2134)).toEqual("5");
    expect(prettyInt(-10.2134)).toEqual("-10");
  });
});

describe("prettyNumber function", () => {
  test("Returns number with 2 decimal points if string is a number", () => {
    expect(prettyNumber(1)).toEqual("1.00");
    expect(prettyNumber(0)).toEqual("0.00");
    expect(prettyNumber(-1)).toEqual("-1.00");
    expect(prettyNumber(25)).toEqual("25.00");
    expect(prettyNumber(-25)).toEqual("-25.00");
    expect(prettyNumber(5.2134)).toEqual("5.21");
    expect(prettyNumber(-10.2134)).toEqual("-10.21");
    expect(prettyNumber(5.56789)).toEqual("5.57");
    expect(prettyNumber(-10.56789)).toEqual("-10.57");
  });
});

describe("prettyPercentage function", () => {
  test("Returns number with 2 decimal points if string is a number", () => {
    expect(prettyNumber(1)).toEqual("1.00");
    expect(prettyNumber(0)).toEqual("0.00");
    expect(prettyNumber(-1)).toEqual("-1.00");
    expect(prettyNumber(25)).toEqual("25.00");
    expect(prettyNumber(-25)).toEqual("-25.00");
    expect(prettyNumber(5.2134)).toEqual("5.21");
    expect(prettyNumber(-10.2134)).toEqual("-10.21");
    expect(prettyNumber(5.56789)).toEqual("5.57");
    expect(prettyNumber(-10.56789)).toEqual("-10.57");
  });
});

describe("prettyTwoNumbers function", () => {
  test("Returns two temperatures", () => {
    expect(prettyTwoNumbers(1, 2)).toEqual("1 | 2");
    expect(prettyTwoNumbers(0, 100000)).toEqual("0 | 100000");
    expect(prettyTwoNumbers(-1, 1)).toEqual("-1 | 1");
    expect(prettyTwoNumbers(-1, -2)).toEqual("-1 | -2");
  });

  test("Returns empty string if one number is not valid", () => {
    expect(prettyTwoNumbers(null, 2)).toEqual("");
    expect(prettyTwoNumbers(0, null)).toEqual("");
    expect(prettyTwoNumbers(undefined, 1)).toEqual("");
    expect(prettyTwoNumbers(-1, undefined)).toEqual("");
    expect(prettyTwoNumbers(1, NaN)).toEqual("");
    expect(prettyTwoNumbers(null, null)).toEqual("");
  });
});
