import { z } from "zod";

// The camera names the panel understands, see apps/panel/src/utils/panel/camera.ts.
export const cameraTypes = [
  "dahua",
  "hikvision",
  "avtech",
  "avm",
  "vivotek",
] as const;

export type MainConfigCameraType = typeof cameraTypes[number];

export const pcOsTypes = ["windows", "ubuntu"] as const;

export type MainConfigPcOs = typeof pcOsTypes[number];

const objectMessage = {
  invalid_type_error: "must be an object",
  required_error: "must be an object",
};

const stringMessage = {
  invalid_type_error: "must be a string",
  required_error: "must be a string",
};

const integerMessage = {
  invalid_type_error: "must be an integer",
  required_error: "must be an integer",
};

const text = z.string(stringMessage);

const integer = z.number(integerMessage).int({ message: "must be an integer" });

const port = integer
  .min(1, { message: "must be between 1 and 65535" })
  .max(65535, { message: "must be between 1 and 65535" });

const positive = integer.min(1, { message: "must be at least 1" });

/*
 * An exact match, no case folding and no extra text.
 * The stored value, the TS type and this check stay one thing,
 * so nothing ever has to rewrite what a maintainer typed.
 */
function oneOf<T extends readonly [string, ...string[]]>(values: T) {
  const message = `must be one of: ${values.join(", ")}`;
  return z.enum(values, { errorMap: () => ({ message }) });
}

const service = z
  .object({ url: text, port, requestTimeout: positive }, objectMessage)
  .strict();

const unit = z.object({ ip: text }, objectMessage).strict();

/*
 * The keys are in the order base.json has them, so a written main.json keeps the
 * order a maintainer is used to reading.
 */
export const mainConfigSchema = z
  .object(
    {
      babybox: z.object({ name: text }, objectMessage).strict(),
      backend: service,
      configer: service,
      // startup has no known shape, so any key is fine there.
      startup: z.object({}, objectMessage).passthrough(),
      units: z
        .object(
          {
            engine: unit,
            thermal: unit,
            requestDelay: positive,
            warningThreshold: positive,
            errorThreshold: positive,
            voltage: z
              .object(
                {
                  divider: positive,
                  multiplier: positive,
                  addition: integer,
                },
                objectMessage
              )
              .strict(),
          },
          objectMessage
        )
        .strict(),
      camera: z
        .object(
          {
            ip: text,
            username: text,
            password: text,
            updateDelay: positive,
            cameraType: oneOf(cameraTypes),
          },
          objectMessage
        )
        .strict(),
      pc: z.object({ os: oneOf(pcOsTypes) }, objectMessage).strict(),
      app: z
        .object(
          { password: text, refreshRequestLimit: positive.optional() },
          objectMessage
        )
        .strict(),
    },
    objectMessage
  )
  .strict();

export type MainConfig = z.infer<typeof mainConfigSchema>;
