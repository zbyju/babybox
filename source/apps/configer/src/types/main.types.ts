export interface ConfigError {
  path: string;
  msg: string;
}

/*
 * The camera names the panel understands, see
 * apps/panel/src/utils/panel/camera.ts. Letter case is ignored when we check a
 * value, because deployed main.json files use "DAHUA" as well as "dahua".
 */
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

export interface MainConfig {
  babybox: MainConfigBabybox;
  backend: MainConfigBackend;
  configer: MainConfigConfiger;
  startup: MainConfigStartup;
  units: MainConfigUnits;
  camera: MainConfigCamera;
  pc: MainConfigPc;
  app: MainConfigApp;
}

export interface MainConfigBabybox {
  name: string;
}

export interface MainConfigBackend {
  url: string;
  port: number;
  requestTimeout: number;
}

export interface MainConfigConfiger {
  url: string;
  port: number;
  requestTimeout: number;
}

export interface MainConfigStartup {}

export interface MainConfigUnits {
  engine: MainConfigUnit;
  thermal: MainConfigUnit;
  requestDelay: number;
  warningThreshold: number;
  errorThreshold: number;
  voltage: MainConfigVoltage;
}

export interface MainConfigVoltage {
  divider: number;
  multiplier: number;
  addition: number;
}

export interface MainConfigUnit {
  ip: string;
}

export interface MainConfigCamera {
  ip: string;
  username: string;
  password: string;
  updateDelay: number;
  cameraType: MainConfigCameraType;
}

export interface MainConfigPc {
  os: MainConfigPcOs;
}

export interface MainConfigApp {
  password: string;
  refreshRequestLimit?: number;
}

type Fields = Record<string, unknown>;

function isFields(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function checkObject(
  errors: ConfigError[],
  value: unknown,
  path: string
): Fields | undefined {
  if (isFields(value)) return value;
  errors.push({ path, msg: "must be an object" });
  return undefined;
}

function checkString(
  errors: ConfigError[],
  value: unknown,
  path: string
): void {
  if (typeof value !== "string") errors.push({ path, msg: "must be a string" });
}

function checkInteger(
  errors: ConfigError[],
  value: unknown,
  path: string
): void {
  if (!Number.isInteger(value)) errors.push({ path, msg: "must be an integer" });
}

function checkOneOf(
  errors: ConfigError[],
  value: unknown,
  path: string,
  allowed: readonly string[]
): void {
  if (typeof value !== "string" || !allowed.includes(value)) {
    errors.push({ path, msg: `must be one of: ${allowed.join(", ")}` });
  }
}

function lowerCased(value: unknown): unknown {
  return typeof value === "string" ? value.toLowerCase() : value;
}

/*
 * The one shape check for main.json. Returns every problem it finds, each with a
 * dotted path, so a caller can point at the field that is wrong.
 */
export function validateMainConfig(config: unknown): ConfigError[] {
  const errors: ConfigError[] = [];
  const root = checkObject(errors, config, "");
  if (!root) return errors;

  const babybox = checkObject(errors, root.babybox, "babybox");
  if (babybox) checkString(errors, babybox.name, "babybox.name");

  for (const service of ["backend", "configer"] as const) {
    const fields = checkObject(errors, root[service], service);
    if (!fields) continue;
    checkString(errors, fields.url, `${service}.url`);
    checkInteger(errors, fields.port, `${service}.port`);
    checkInteger(errors, fields.requestTimeout, `${service}.requestTimeout`);
  }

  checkObject(errors, root.startup, "startup");

  const units = checkObject(errors, root.units, "units");
  if (units) {
    for (const unit of ["engine", "thermal"] as const) {
      const fields = checkObject(errors, units[unit], `units.${unit}`);
      if (fields) checkString(errors, fields.ip, `units.${unit}.ip`);
    }
    checkInteger(errors, units.requestDelay, "units.requestDelay");
    checkInteger(errors, units.warningThreshold, "units.warningThreshold");
    checkInteger(errors, units.errorThreshold, "units.errorThreshold");

    const voltage = checkObject(errors, units.voltage, "units.voltage");
    if (voltage) {
      checkInteger(errors, voltage.divider, "units.voltage.divider");
      checkInteger(errors, voltage.multiplier, "units.voltage.multiplier");
      checkInteger(errors, voltage.addition, "units.voltage.addition");
    }
  }

  const camera = checkObject(errors, root.camera, "camera");
  if (camera) {
    checkString(errors, camera.ip, "camera.ip");
    checkString(errors, camera.username, "camera.username");
    checkString(errors, camera.password, "camera.password");
    checkInteger(errors, camera.updateDelay, "camera.updateDelay");
    checkOneOf(
      errors,
      lowerCased(camera.cameraType),
      "camera.cameraType",
      cameraTypes
    );
  }

  const pc = checkObject(errors, root.pc, "pc");
  // Exact match: the backend compares `pc.os === "ubuntu"`.
  if (pc) checkOneOf(errors, pc.os, "pc.os", pcOsTypes);

  const app = checkObject(errors, root.app, "app");
  if (app) {
    checkString(errors, app.password, "app.password");
    if (app.refreshRequestLimit !== undefined) {
      checkInteger(errors, app.refreshRequestLimit, "app.refreshRequestLimit");
    }
  }

  return errors;
}
