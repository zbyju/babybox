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

export function isInstanceOfMainConfig(obj: any): obj is MainConfig {
  if (!obj || typeof obj !== "object") return false;
  return (
    "babybox" in obj &&
    "backend" in obj &&
    "configer" in obj &&
    "units" in obj &&
    "camera" in obj &&
    "pc" in obj &&
    "app" in obj &&
    isInstanceOfMainConfigApp(obj.app) &&
    isInstanceOfMainConfigBabybox(obj.babybox) &&
    isInstanceOfMainConfigBackend(obj.backend) &&
    isInstanceOfMainConfigConfiger(obj.configer) &&
    isInstanceOfMainConfigUnits(obj.units) &&
    isInstanceOfMainConfigCamera(obj.camera) &&
    isInstanceOfMainConfigPc(obj.pc)
  );
}

export interface MainConfigBabybox {
  name: string;
}

export function isInstanceOfMainConfigBabybox(
  obj: any
): obj is MainConfigBabybox {
  if (!obj || typeof obj !== "object") return false;
  return "name" in obj && typeof obj.name === "string";
}

export interface MainConfigBackend {
  url: string;
  port: number;
  requestTimeout: number;
}

export function isInstanceOfMainConfigBackend(
  obj: any
): obj is MainConfigBackend {
  if (!obj || typeof obj !== "object") return false;
  return (
    "url" in obj &&
    "port" in obj &&
    "requestTimeout" in obj &&
    typeof obj.url === "string" &&
    Number.isInteger(obj.port) &&
    Number.isInteger(obj.requestTimeout)
  );
}

export interface MainConfigConfiger {
  url: string;
  port: number;
  requestTimeout: number;
}

export function isInstanceOfMainConfigConfiger(
  obj: any
): obj is MainConfigConfiger {
  if (!obj || typeof obj !== "object") return false;
  return (
    "url" in obj &&
    "port" in obj &&
    "requestTimeout" in obj &&
    typeof obj.url === "string" &&
    Number.isInteger(obj.port) &&
    Number.isInteger(obj.requestTimeout)
  );
}

export interface MainConfigStartup {}

export interface MainConfigUnits {
  requestDelay: number;
  warningThreshold: number;
  errorThreshold: number;
  voltage: MainConfigVoltage;
}

export function isInstanceOfMainConfigUnits(obj: any): obj is MainConfigUnits {
  if (!obj || typeof obj !== "object") return false;
  return (
    "requestDelay" in obj &&
    "warningThreshold" in obj &&
    "errorThreshold" in obj &&
    "voltage" in obj &&
    Number.isInteger(obj.requestDelay) &&
    Number.isInteger(obj.warningThreshold) &&
    Number.isInteger(obj.errorThreshold) &&
    isInstanceOfMainConfigVoltage(obj.voltage)
  );
}

export interface MainConfigVoltage {
  divider: number;
  multiplier: number;
  addition: number;
}

export function isInstanceOfMainConfigVoltage(
  obj: any
): obj is MainConfigVoltage {
  if (!obj || typeof obj !== "object") return false;
  return (
    "divider" in obj &&
    "multiplier" in obj &&
    "addition" in obj &&
    Number.isInteger(obj.divider) &&
    Number.isInteger(obj.multiplier) &&
    Number.isInteger(obj.addition)
  );
}

export interface MainConfigUnit {
  ip: string;
}

export function isInstanceOfMainConfigUnit(obj: any): obj is MainConfigUnit {
  if (!obj || typeof obj !== "object") return false;
  return "ip" in obj && typeof obj.ip === "string";
}

export interface MainConfigCamera {
  ip: string;
  username: string;
  password: string;
  updateDelay: number;
  cameraType: string;
}

export function isInstanceOfMainConfigCamera(
  obj: any
): obj is MainConfigCamera {
  if (!obj || typeof obj !== "object") return false;
  return (
    "ip" in obj &&
    "username" in obj &&
    "password" in obj &&
    "updateDelay" in obj &&
    "cameraType" in obj &&
    typeof obj.ip === "string" &&
    typeof obj.username === "string" &&
    typeof obj.password === "string" &&
    typeof obj.cameraType === "string" &&
    ["dahua", "avtech", "vivotek"].includes(obj.cameraType) &&
    Number.isInteger(obj.updateDelay)
  );
}

export interface MainConfigPc {
  os: "windows" | "ubuntu";
}

export function isInstanceOfMainConfigPc(obj: any): obj is MainConfigPc {
  if (!obj || typeof obj !== "object") return false;
  return (
    "os" in obj &&
    typeof obj.os === "string" &&
    ["windows", "ubuntu"].includes(obj.os)
  );
}

export interface MainConfigApp {
  password: string;
}

export function isInstanceOfMainConfigApp(obj: any): obj is MainConfigApp {
  if (!obj || typeof obj !== "object") return false;
  return "password" in obj && typeof obj.password === "string";
}
