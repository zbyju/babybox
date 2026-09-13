import { describe, expect, it } from "vitest";
import { z } from "zod";

import { defaultConfig } from "./defaults";
import { applyTierLabels, configForm, configFormFields } from "./form";
import { mainConfigSchema } from "./schema";

/*
 * This test is why the descriptor lives beside the schema. The descriptor is a
 * hand-written table, so only a test keeps it from drifting: a field added to the
 * schema with no row, or a row for a field that is gone.
 */

/*
 * `startup` is z.object({}).passthrough(), so its shape is empty and it yields no
 * leaf. That is what the form does too: it draws no row for it.
 */
function leafPaths(shape: z.ZodRawShape, prefix = ""): string[] {
  return Object.entries(shape).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    const inner = value instanceof z.ZodOptional ? value.unwrap() : value;
    if (inner instanceof z.ZodObject) return leafPaths(inner.shape, path);
    return [path];
  });
}

const schemaPaths = leafPaths(mainConfigSchema.shape);
const formPaths = configFormFields.map((field) => field.path);

describe("configForm covers the schema", () => {
  it("has a row for every leaf of the schema", () => {
    expect([...formPaths].sort()).toEqual([...schemaPaths].sort());
  });

  it("draws no row for startup", () => {
    expect(formPaths.filter((path) => path.startsWith("startup"))).toEqual([]);
  });

  it("keeps the schema's field order", () => {
    expect(formPaths).toEqual(schemaPaths);
  });

  it("names every path once", () => {
    expect(new Set(formPaths).size).toBe(formPaths.length);
  });

  it("puts every field under its own top-level section", () => {
    for (const section of configForm) {
      for (const field of section.fields) {
        expect(field.path.startsWith(`${section.key}.`)).toBe(true);
      }
    }
  });
});

describe("configForm field metadata", () => {
  it("gives a select widget its options and no other widget any", () => {
    for (const field of configFormFields) {
      if (field.widget === "select") expect(field.options?.length).toBeTruthy();
      else expect(field.options).toBeUndefined();
    }
  });

  it("carries a tier the labels know", () => {
    for (const field of configFormFields) {
      expect(applyTierLabels[field.tier]).toBeTruthy();
    }
  });

  /*
   * The tier is a promise to a maintainer standing at a hospital box. A wrong one
   * sends them to restart a process that did not need it, or nothing at all.
   */
  it("puts the fields POST /reload applies on the backendReload tier", () => {
    const byTier = configFormFields
      .filter((field) => field.tier === "backendReload")
      .map((field) => field.path);
    expect(byTier).toEqual(["units.engine.ip", "units.thermal.ip", "pc.os"]);
  });

  it("leaves only the two fields bound at listen on the backendRestart tier", () => {
    const byTier = configFormFields
      .filter((field) => field.tier === "backendRestart")
      .map((field) => field.path);
    expect(byTier).toEqual(["backend.url", "backend.port"]);
  });

  it("marks only the two configer address fields read-only", () => {
    const readOnly = configFormFields
      .filter((field) => field.readOnly)
      .map((field) => field.path);
    expect(readOnly).toEqual(["configer.url", "configer.port"]);
  });

  it("marks only the fields the schema allows to be missing as optional", () => {
    const optional = configFormFields
      .filter((field) => field.optional)
      .map((field) => field.path);
    expect(optional).toEqual(["app.refreshRequestLimit"]);
  });

  /*
   * The dialog is the last thing between a maintainer and a box nobody can reach.
   * The list is spelled out here so adding a field to it is a deliberate edit with
   * a reviewer, not something a hint reword can do by accident.
   */
  it("asks before a save only on the fields that can cut the box off", () => {
    const asking = configFormFields
      .filter((field) => field.confirm)
      .map((field) => field.path);
    expect(asking).toEqual([
      "backend.url",
      "backend.port",
      "units.engine.ip",
      "units.thermal.ip",
      "app.password",
    ]);
  });

  /* A read-only field never counts as changed, so its question could never show. */
  it("puts no question on a read-only field", () => {
    for (const field of configFormFields) {
      if (field.readOnly) expect(field.confirm).toBeUndefined();
    }
  });

  it("offers a select only values the schema accepts", () => {
    const config = defaultConfig();
    for (const field of configFormFields) {
      if (field.widget !== "select") continue;
      for (const option of field.options ?? []) {
        const [section, key] = field.path.split(".");
        const value = {
          ...config,
          [section]: { ...config[section as keyof typeof config], [key]: option },
        };
        expect(mainConfigSchema.safeParse(value).success).toBe(true);
      }
    }
  });
});
