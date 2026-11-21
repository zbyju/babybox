import { validateMainConfig } from "@babybox/config-schema";
import { z } from "zod";

import { panelReadableConfigSchema } from "@/types/panel/config.types";

const versionsSchema = z.object({
  startup: z.string(),
  backend: z.string(),
  configer: z.string(),
  frontend: z.string(),
});

export const parsePanelConfig = (value: unknown) => {
  const errors = validateMainConfig(value);
  if (errors.length > 0)
    console.warn("Config file does not match the schema", errors);

  return panelReadableConfigSchema.safeParse(value);
};

export const parseVersions = (value: unknown) =>
  versionsSchema.safeParse(value);
