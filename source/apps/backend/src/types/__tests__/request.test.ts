import {
  isInstanceOfArraySetting,
  isInstanceOfGetUnitSettingsRequest,
  isInstanceOfPostUnitSettingsRequestBody,
  isInstanceOfSetting,
} from "../request.types";

describe("request.types.ts", () => {
  describe("isInstanceOfPostUnitSettingsRequestBody", () => {
    it("should return true for objects that have settings property", () => {
      expect(
        isInstanceOfPostUnitSettingsRequestBody({
          settings: [],
        })
      ).toBe(true);

      expect(
        isInstanceOfPostUnitSettingsRequestBody({
          settings: [{ index: 0, value: 10, unit: "engine" }],
        })
      ).toBe(true);

      expect(
        isInstanceOfPostUnitSettingsRequestBody({
          settings: [
            { index: 0, value: 10, unit: "engine" },
            { index: 0, value: 10, unit: "thermal" },
          ],
        })
      ).toBe(true);

      expect(
        isInstanceOfPostUnitSettingsRequestBody({
          settings: [
            { index: 0, value: 112340, unit: "engine" },
            { index: 0, value: 112351230, unit: "thermal" },
          ],
        })
      ).toBe(true);
    });

    it("should return true for objects that have settings and options", () => {
      expect(
        isInstanceOfPostUnitSettingsRequestBody({
          settings: [],
          options: {},
        })
      ).toBe(true);

      expect(
        isInstanceOfPostUnitSettingsRequestBody({
          settings: [{ index: 0, value: 10, unit: "engine" }],
          options: {
            timeout: 10,
          },
        })
      ).toBe(true);

      expect(
        isInstanceOfPostUnitSettingsRequestBody({
          settings: [
            { index: 0, value: 112340, unit: "engine" },
            { index: 0, value: 112351230, unit: "thermal" },
          ],
          options: {
            timeout: 20,
          },
        })
      ).toBe(true);
    });

    it("should return true for objects that settings and additional fields", () => {
      expect(
        isInstanceOfPostUnitSettingsRequestBody({
          settings: [],
          weirdfield: {},
          wrong: "wrong",
          notspecified: 123,
        })
      ).toBe(true);
    });

    it("should return false for objects without settings", () => {
      expect(
        isInstanceOfPostUnitSettingsRequestBody({
          weirdfield: {},
          wrong: "wrong",
          notspecified: 123,
        })
      ).toBe(false);

      expect(
        isInstanceOfPostUnitSettingsRequestBody({
          options: {},
        })
      ).toBe(false);

      expect(
        isInstanceOfPostUnitSettingsRequestBody({
          options: { timeout: 123 },
        })
      ).toBe(false);
    });

    it("should return false for non objects", () => {
      expect(isInstanceOfPostUnitSettingsRequestBody("wrong")).toBe(false);
      expect(isInstanceOfPostUnitSettingsRequestBody(1234)).toBe(false);
      expect(isInstanceOfPostUnitSettingsRequestBody(true)).toBe(false);
      expect(isInstanceOfPostUnitSettingsRequestBody(false)).toBe(false);

      expect(
        isInstanceOfPostUnitSettingsRequestBody([
          { index: 0, value: 10, unit: "engine" },
        ])
      ).toBe(false);

      expect(isInstanceOfPostUnitSettingsRequestBody([1, 2, 3])).toBe(false);
    });

    it("should return false for null values", () => {
      expect(isInstanceOfPostUnitSettingsRequestBody(null)).toBe(false);
      expect(isInstanceOfPostUnitSettingsRequestBody(undefined)).toBe(false);
      expect(isInstanceOfPostUnitSettingsRequestBody("")).toBe(false);
      expect(isInstanceOfPostUnitSettingsRequestBody(0)).toBe(false);
      expect(isInstanceOfPostUnitSettingsRequestBody({})).toBe(false);
    });
  });

  describe("isInstanceOfGetUnitSettingsRequest", () => {
    it("should return true for objects without unit and timeout", () => {
      expect(isInstanceOfGetUnitSettingsRequest({})).toBe(true);
      expect(
        isInstanceOfGetUnitSettingsRequest({ randomg: 123, wrong: "wrong" })
      ).toBe(true);
    });

    it("should return true for objects that have unit with correct value", () => {
      expect(isInstanceOfGetUnitSettingsRequest({ unit: "both" })).toBe(true);
      expect(isInstanceOfGetUnitSettingsRequest({ unit: "engine" })).toBe(true);
      expect(isInstanceOfGetUnitSettingsRequest({ unit: "thermal" })).toBe(
        true
      );
    });

    it("should return false for objects with wrong unit", () => {
      expect(isInstanceOfGetUnitSettingsRequest({ unit: "motor" })).toBe(false);
      expect(isInstanceOfGetUnitSettingsRequest({ unit: "topeni" })).toBe(
        false
      );
      expect(isInstanceOfGetUnitSettingsRequest({ unit: "unit" })).toBe(false);
    });

    it("should return false for non objects", () => {
      expect(isInstanceOfGetUnitSettingsRequest("wrong")).toBe(false);
      expect(isInstanceOfGetUnitSettingsRequest(1234)).toBe(false);
      expect(isInstanceOfGetUnitSettingsRequest(true)).toBe(false);
      expect(isInstanceOfGetUnitSettingsRequest(false)).toBe(false);
    });

    it("should return false for null values", () => {
      expect(isInstanceOfGetUnitSettingsRequest(null)).toBe(false);
      expect(isInstanceOfGetUnitSettingsRequest(undefined)).toBe(false);
      expect(isInstanceOfGetUnitSettingsRequest("")).toBe(false);
      expect(isInstanceOfGetUnitSettingsRequest(0)).toBe(false);
    });
  });

  describe("isInstanceOfSetting", () => {
    it("should return true for objects with all fields", () => {
      expect(
        isInstanceOfSetting({ index: 5, value: 1203, unit: "engine" })
      ).toBe(true);
      expect(
        isInstanceOfSetting({ index: 10, value: -1234, unit: "thermal" })
      ).toBe(true);
    });

    it("should return true for objects with additional fields", () => {
      expect(
        isInstanceOfSetting({
          index: 5,
          value: 1203,
          unit: "engine",
          nonExistent: 123,
        })
      ).toBe(true);
      expect(
        isInstanceOfSetting({
          index: 10,
          value: -1234,
          unit: "thermal",
          wrong: "wrong",
        })
      ).toBe(true);
    });

    it("should return false for objects that have unit with incorrect value", () => {
      expect(
        isInstanceOfSetting({
          index: 10,
          value: 1234,
          unit: "motory",
        })
      ).toBe(false);
      expect(
        isInstanceOfSetting({
          index: 10,
          value: 1234,
          unit: "motory",
        })
      ).toBe(false);
      expect(
        isInstanceOfSetting({
          index: 10,
          value: 1234,
          unit: "topeni",
        })
      ).toBe(false);
      expect(
        isInstanceOfSetting({
          index: 10,
          value: 1234,
          unit: "both",
        })
      ).toBe(false);
    });

    it("should return false for objects with wrong values", () => {
      expect(
        isInstanceOfSetting({
          index: 10.5,
          value: 1234,
          unit: "engine",
        })
      ).toBe(false);

      expect(
        isInstanceOfSetting({
          index: 10,
          value: "1234",
          unit: "engine",
        })
      ).toBe(false);

      expect(
        isInstanceOfSetting({
          index: "10",
          value: 1234,
          unit: "engine",
        })
      ).toBe(false);
    });

    it("should return false for non objects", () => {
      expect(isInstanceOfSetting("wrong")).toBe(false);
      expect(isInstanceOfSetting(1234)).toBe(false);
      expect(isInstanceOfSetting(true)).toBe(false);
      expect(isInstanceOfSetting(false)).toBe(false);
    });

    it("should return false for null values", () => {
      expect(isInstanceOfSetting(null)).toBe(false);
      expect(isInstanceOfSetting(undefined)).toBe(false);
      expect(isInstanceOfSetting("")).toBe(false);
      expect(isInstanceOfSetting(0)).toBe(false);
      expect(isInstanceOfSetting({})).toBe(false);
    });
  });

  describe("isInstanceOfArraySetting", () => {
    it("should return true for arrays with 1 object", () => {
      expect(
        isInstanceOfArraySetting([{ index: 5, value: 1203, unit: "engine" }])
      ).toBe(true);
      expect(
        isInstanceOfArraySetting([{ index: 10, value: -1234, unit: "thermal" }])
      ).toBe(true);
    });

    it("should return true for arrays with multiple objects", () => {
      expect(
        isInstanceOfArraySetting([
          { index: 5, value: 1203, unit: "engine" },
          { index: 10, value: -1234, unit: "thermal" },
          { index: 15, value: 304, unit: "thermal" },
          { index: 20, value: 0, unit: "engine" },
        ])
      ).toBe(true);
    });

    it("should return true for objects with additional fields", () => {
      expect(
        isInstanceOfArraySetting([
          {
            index: 5,
            value: 1203,
            unit: "engine",
            nonExistent: 123,
          },
        ])
      ).toBe(true);
      expect(
        isInstanceOfArraySetting([
          {
            index: 10,
            value: -1234,
            unit: "thermal",
            wrong: "wrong",
          },
        ])
      ).toBe(true);
    });

    it("should return false for objects that have unit with incorrect value", () => {
      expect(
        isInstanceOfArraySetting([
          {
            index: 10,
            value: 1234,
            unit: "motory",
          },
        ])
      ).toBe(false);
      expect(
        isInstanceOfArraySetting([
          {
            index: 10,
            value: 1234,
            unit: "motory",
          },
        ])
      ).toBe(false);
      expect(
        isInstanceOfArraySetting([
          {
            index: 10,
            value: 1234,
            unit: "topeni",
          },
        ])
      ).toBe(false);
      expect(
        isInstanceOfArraySetting([
          {
            index: 10,
            value: 1234,
            unit: "both",
          },
        ])
      ).toBe(false);
    });

    it("should return false for objects with wrong values", () => {
      expect(
        isInstanceOfArraySetting([
          {
            index: 10.5,
            value: 1234,
            unit: "engine",
          },
        ])
      ).toBe(false);

      expect(
        isInstanceOfArraySetting([
          {
            index: 10,
            value: "1234",
            unit: "engine",
          },
        ])
      ).toBe(false);

      expect(
        isInstanceOfArraySetting([
          {
            index: "10",
            value: 1234,
            unit: "engine",
          },
        ])
      ).toBe(false);
    });

    it("should return false for non arrays", () => {
      expect(isInstanceOfArraySetting("wrong")).toBe(false);
      expect(isInstanceOfArraySetting(1234)).toBe(false);
      expect(isInstanceOfArraySetting(true)).toBe(false);
      expect(isInstanceOfArraySetting(false)).toBe(false);
    });

    it("should return false for null values", () => {
      expect(isInstanceOfArraySetting(null)).toBe(false);
      expect(isInstanceOfArraySetting(undefined)).toBe(false);
      expect(isInstanceOfArraySetting("")).toBe(false);
      expect(isInstanceOfArraySetting(0)).toBe(false);
      expect(isInstanceOfArraySetting({})).toBe(false);
    });
  });
});
