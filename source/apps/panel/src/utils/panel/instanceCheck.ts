import { validateMainConfig } from "@babybox/config-schema";

import type { Config } from "@/types/panel/config.types";
import type { Versions } from "@/types/panel/versions.types";

type Fields = Record<string, unknown>;

const isObject = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isString = (value: unknown): boolean => typeof value === "string";

const isNumber = (value: unknown): boolean => typeof value === "number";

/* The panel turns the refresh off when it is missing, null or not above zero. */
const isNumberOrUnset = (value: unknown): boolean =>
  value === undefined || value === null || isNumber(value);

/*
 * Only the shape the panel reads: the five sections, and a string or a number where
 * the panel expects one. No ranges and no name lists. A stored value the schema
 * refuses is one the panel has always coped with, and refusing the config here
 * leaves the box with no panel, no watchdog and nobody on site until someone drives
 * out. PUT /config/main still applies every rule.
 */
const isReadableConfig = (value: unknown): boolean => {
  if (!isObject(value)) return false;

  const { app, babybox, backend, camera, units } = value;
  if (!isObject(app) || !isObject(babybox) || !isObject(backend)) return false;
  if (!isObject(camera) || !isObject(units)) return false;

  const { engine, thermal, voltage } = units;
  if (!isObject(engine) || !isObject(thermal) || !isObject(voltage))
    return false;

  return (
    isString(app["password"]) &&
    isNumberOrUnset(app["refreshRequestLimit"]) &&
    isString(babybox["name"]) &&
    isString(backend["url"]) &&
    isNumber(backend["port"]) &&
    isNumber(backend["requestTimeout"]) &&
    isString(camera["ip"]) &&
    isString(camera["username"]) &&
    isString(camera["password"]) &&
    isString(camera["cameraType"]) &&
    isNumber(camera["updateDelay"]) &&
    isString(engine["ip"]) &&
    isString(thermal["ip"]) &&
    isNumber(units["requestDelay"]) &&
    isNumber(units["warningThreshold"]) &&
    isNumber(units["errorThreshold"]) &&
    isNumber(voltage["divider"]) &&
    isNumber(voltage["multiplier"]) &&
    isNumber(voltage["addition"])
  );
};

export const isInstanceOfConfig = (object: unknown): object is Config => {
  const errors = validateMainConfig(object);
  if (errors.length > 0)
    console.warn("Config file does not match the schema", errors);

  return isReadableConfig(object);
};

export const isInstanceOfVersions = (object: unknown): object is Versions => {
  return (
    typeof object === "object" &&
    object !== null &&
    "startup" in object &&
    "backend" in object &&
    "configer" in object &&
    "frontend" in object
  );
};
