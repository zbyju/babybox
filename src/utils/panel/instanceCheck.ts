import type { Config } from "@/types/panel/config.types";

export const isInstanceOfConfig = (object: any): object is Config => {
  return (
    typeof object === "object" &&
    "api" in object &&
    "app" in object &&
    "babybox" in object &&
    "camera" in object &&
    "units" in object
  );
};
