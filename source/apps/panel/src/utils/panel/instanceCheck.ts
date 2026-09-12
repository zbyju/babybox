import { isMainConfig } from "@babybox/config-schema";

import type { Config } from "@/types/panel/config.types";
import type { Versions } from "@/types/panel/versions.types";

/*
 * The whole config file, checked against the shared schema. The panel only reads
 * five sections, but configer sends all of them and a wrong value anywhere is a
 * config the maintainer has to see.
 */
export const isInstanceOfConfig = (object: unknown): object is Config =>
  isMainConfig(object);

export const isInstanceOfVersions = (object: any): object is Versions => {
  return (
    typeof object === "object" &&
    object !== null &&
    "startup" in object &&
    "backend" in object &&
    "configer" in object &&
    "frontend" in object
  );
};
