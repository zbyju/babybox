/// <reference types="node" />

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { bindingPort, z } from "./boundaries.js";

const fixture = new URL(
  "../../../scripts/binding-port-cases.json",
  import.meta.url
);
const raw: unknown = JSON.parse(readFileSync(fixture, "utf8"));
const cases = z
  .array(
    z.object({
      stored: z.unknown(),
      env: z.unknown(),
      fallback: z.number(),
      expected: z.number(),
    })
  )
  .parse(raw);

describe("binding port", () => {
  it.each(cases)(
    "binds $expected for stored $stored and env $env",
    ({ stored, env, fallback, expected }) => {
      expect(bindingPort(stored, env, fallback)).toBe(expected);
    }
  );

  it("rejects a decimal string whose conversion overflows", () => {
    expect(bindingPort("9".repeat(309), undefined, 6000)).toBe(6000);
  });
});
