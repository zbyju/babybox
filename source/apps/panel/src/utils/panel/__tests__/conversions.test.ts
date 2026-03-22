import { describe, it, expect } from "vitest";

import { TableBlockState, TableRowState } from "@/types/panel/tables.types";

import {
  stringToNumber,
  stringToNumberWithDecimals,
  numberToVoltage,
  stringToVoltage,
  stringBooleanToBoolean,
  partitionedTimeToMoment,
  booleanToTableBlockState,
  maybeValueToTableRowValue,
} from "../conversions";

describe("conversions", () => {
  describe("stringToNumber", () => {
    it("should convert valid numeric string", () => {
      expect(stringToNumber("123")).toBe(123);
    });

    it("should handle zero", () => {
      expect(stringToNumber("0")).toBe(0);
    });

    it("should handle negative numbers", () => {
      expect(stringToNumber("-42")).toBe(-42);
    });

    it("should return undefined for invalid string", () => {
      expect(stringToNumber("abc")).toBeUndefined();
    });

    it("should return undefined for empty string", () => {
      expect(stringToNumber("")).toBeUndefined();
    });
  });

  describe("stringToNumberWithDecimals", () => {
    it("should convert and divide by 100", () => {
      expect(stringToNumberWithDecimals("2500")).toBe(25);
    });

    it("should handle zero", () => {
      expect(stringToNumberWithDecimals("0")).toBe(0);
    });

    it("should handle values less than 100", () => {
      expect(stringToNumberWithDecimals("50")).toBe(0.5);
    });

    it("should return undefined for invalid string", () => {
      expect(stringToNumberWithDecimals("abc")).toBeUndefined();
    });
  });

  describe("numberToVoltage", () => {
    it("should convert with default config", () => {
      const result = numberToVoltage(630, {
        divider: 63,
        multiplier: 100,
        addition: 0,
      });
      expect(result).toBe(1000);
    });

    it("should handle zero", () => {
      expect(numberToVoltage(0, { divider: 63, multiplier: 100, addition: 0 })).toBe(0);
    });

    it("should apply addition", () => {
      const result = numberToVoltage(630, {
        divider: 63,
        multiplier: 100,
        addition: 5,
      });
      expect(result).toBe(1005);
    });

    it("should handle typical voltage config", () => {
      // Real voltage config from the app
      const result = numberToVoltage(3400, {
        divider: 3400,
        multiplier: 100,
        addition: 0,
      });
      expect(result).toBe(100);
    });
  });

  describe("stringToVoltage", () => {
    it("should convert valid string to voltage", () => {
      const result = stringToVoltage("3400", {
        divider: 3400,
        multiplier: 100,
        addition: 0,
      });
      expect(result).toBe(100);
    });

    it("should return undefined for invalid string", () => {
      const result = stringToVoltage("abc", {
        divider: 3400,
        multiplier: 100,
        addition: 0,
      });
      expect(result).toBeUndefined();
    });
  });

  describe("stringBooleanToBoolean", () => {
    it("should return true for non-zero", () => {
      expect(stringBooleanToBoolean("1")).toBe(true);
      expect(stringBooleanToBoolean("5")).toBe(true);
      expect(stringBooleanToBoolean("100")).toBe(true);
    });

    it("should return false for zero", () => {
      expect(stringBooleanToBoolean("0")).toBe(false);
    });

    it("should return undefined for invalid string", () => {
      expect(stringBooleanToBoolean("abc")).toBeUndefined();
    });
  });

  describe("partitionedTimeToMoment", () => {
    it("should parse valid date parts with 4-digit year", () => {
      const result = partitionedTimeToMoment("15", "03", "2026", "10", "30", "45");
      expect(result).toBeDefined();
      expect(result?.isValid()).toBe(true);
      expect(result?.date()).toBe(15);
      expect(result?.month()).toBe(2); // 0-indexed
      expect(result?.year()).toBe(2026);
      expect(result?.hour()).toBe(10);
      expect(result?.minute()).toBe(30);
      expect(result?.second()).toBe(45);
    });

    it("should handle single digit values with 4-digit year", () => {
      const result = partitionedTimeToMoment("1", "1", "2026", "1", "1", "1");
      expect(result).toBeDefined();
      expect(result?.isValid()).toBe(true);
    });

    it("should return undefined for invalid date", () => {
      const result = partitionedTimeToMoment("99", "99", "9999", "99", "99", "99");
      expect(result).toBeUndefined();
    });
  });

  describe("booleanToTableBlockState", () => {
    it("should return Error for undefined", () => {
      expect(booleanToTableBlockState(undefined)).toBe(TableBlockState.Error);
    });

    it("should return activeColor for true", () => {
      expect(booleanToTableBlockState(true)).toBe(TableBlockState.ColorSuccess);
    });

    it("should return custom activeColor for true", () => {
      expect(booleanToTableBlockState(true, TableBlockState.ColorWarning)).toBe(
        TableBlockState.ColorWarning,
      );
    });

    it("should return Inactive for false", () => {
      expect(booleanToTableBlockState(false)).toBe(TableBlockState.Inactive);
    });
  });

  describe("maybeValueToTableRowValue", () => {
    it("should return Error state for undefined value", () => {
      const result = maybeValueToTableRowValue(undefined, (v) => String(v));
      expect(result.state).toBe(TableRowState.Error);
      expect(result.value).toBeUndefined();
    });

    it("should return Ok state with formatted value for defined value", () => {
      const result = maybeValueToTableRowValue(42, (v) => `${v}V`);
      expect(result.state).toBe(TableRowState.Ok);
      expect(result.value).toBe("42V");
    });

    it("should use custom ok state", () => {
      const result = maybeValueToTableRowValue(
        42,
        (v) => String(v),
        [],
        TableRowState.ColorSuccess,
      );
      expect(result.state).toBe(TableRowState.ColorSuccess);
    });

    it("should pass additional args to display function", () => {
      const result = maybeValueToTableRowValue(10, (v: number, unit: string) => `${v} ${unit}`, [
        "kg",
      ]);
      expect(result.value).toBe("10 kg");
    });
  });
});
