import { asPipeFields, parseUnitBody } from "../unit-body";

describe("unit-body", () => {
  it("accepts a ready-check integer", () => {
    expect(parseUnitBody(0)).toBe(0);
  });

  it("accepts a RAM window string", () => {
    expect(parseUnitBody("0|1|2")).toBe("0|1|2");
  });

  it("rejects an object body", () => {
    expect(parseUnitBody({ msg: "nope" })).toBeUndefined();
  });

  it("splits a pipe window and leaves a number alone", () => {
    expect(asPipeFields("7|0|0")).toEqual(["7", "0", "0"]);
    expect(asPipeFields(0)).toBeUndefined();
  });
});
