import { z } from "zod";

// The camera names the panel understands, see apps/panel/src/utils/panel/camera.ts.
export const cameraTypes = [
  "dahua",
  "hikvision",
  "avtech",
  "avm",
  "vivotek",
] as const;

export type MainConfigCameraType = (typeof cameraTypes)[number];

export const pcOsTypes = ["windows", "ubuntu"] as const;

export type MainConfigPcOs = (typeof pcOsTypes)[number];

const objectError = { error: "must be an object" };
const integerError = { error: "must be an integer" };

const text = z.string({ error: "must be a string" });

// Keep the stored number contract, including integers outside the safe range.
const integer = z
  .custom<number>(
    (value) => typeof value === "number" && !Number.isNaN(value),
    {
      ...integerError,
      abort: true,
    }
  )
  .refine(Number.isInteger, integerError);

const port = integer.refine((value) => value >= 1 && value <= 65535, {
  error: "must be between 1 and 65535",
});

const positive = integer.refine((value) => value >= 1, {
  error: "must be at least 1",
});

/*
 * An exact match, no case folding and no extra text.
 * The stored value, the TS type and this check stay one thing,
 * so nothing ever has to rewrite what a maintainer typed.
 */
function oneOf<T extends readonly [string, ...string[]]>(values: T) {
  const message = `must be one of: ${values.join(", ")}`;
  return z.enum(values, { error: message });
}

const service = z.strictObject(
  { url: text, port, requestTimeout: positive },
  objectError
);

const unit = z.strictObject({ ip: text }, objectError);

/*
 * The keys are in the order base.json has them, so a written main.json keeps the
 * order a maintainer is used to reading.
 */
export const mainConfigSchema = z.strictObject(
  {
    babybox: z.strictObject({ name: text }, objectError),
    backend: service,
    configer: service,
    // startup has no known shape, so any key is fine there.
    startup: z.looseObject({}, objectError),
    units: z.strictObject(
      {
        engine: unit,
        thermal: unit,
        requestDelay: positive,
        warningThreshold: positive,
        errorThreshold: positive,
        voltage: z.strictObject(
          {
            divider: positive,
            multiplier: positive,
            addition: integer,
          },
          objectError
        ),
      },
      objectError
    ),
    camera: z.strictObject(
      {
        ip: text,
        username: text,
        password: text,
        updateDelay: positive,
        cameraType: oneOf(cameraTypes),
      },
      objectError
    ),
    pc: z.strictObject({ os: oneOf(pcOsTypes) }, objectError),
    app: z.strictObject(
      { password: text, refreshRequestLimit: positive.optional() },
      objectError
    ),
  },
  objectError
);

export type MainConfig = z.infer<typeof mainConfigSchema>;
