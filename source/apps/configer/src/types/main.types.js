export function isInstanceOfMainConfig(obj) {
    if (!obj || typeof obj !== "object")
        return false;
    return ("babybox" in obj &&
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
        isInstanceOfMainConfigPc(obj.pc));
}
export function isInstanceOfMainConfigBabybox(obj) {
    if (!obj || typeof obj !== "object")
        return false;
    return "name" in obj && typeof obj.name === "string";
}
export function isInstanceOfMainConfigBackend(obj) {
    if (!obj || typeof obj !== "object")
        return false;
    return ("url" in obj &&
        "port" in obj &&
        "requestTimeout" in obj &&
        typeof obj.url === "string" &&
        Number.isInteger(obj.port) &&
        Number.isInteger(obj.requestTimeout));
}
export function isInstanceOfMainConfigConfiger(obj) {
    if (!obj || typeof obj !== "object")
        return false;
    return ("url" in obj &&
        "port" in obj &&
        "requestTimeout" in obj &&
        typeof obj.url === "string" &&
        Number.isInteger(obj.port) &&
        Number.isInteger(obj.requestTimeout));
}
export function isInstanceOfMainConfigUnits(obj) {
    if (!obj || typeof obj !== "object")
        return false;
    return ("requestDelay" in obj &&
        "warningThreshold" in obj &&
        "errorThreshold" in obj &&
        "voltage" in obj &&
        Number.isInteger(obj.requestDelay) &&
        Number.isInteger(obj.warningThreshold) &&
        Number.isInteger(obj.errorThreshold) &&
        isInstanceOfMainConfigVoltage(obj.voltage));
}
export function isInstanceOfMainConfigVoltage(obj) {
    if (!obj || typeof obj !== "object")
        return false;
    return ("divider" in obj &&
        "multiplier" in obj &&
        "addition" in obj &&
        Number.isInteger(obj.divider) &&
        Number.isInteger(obj.multiplier) &&
        Number.isInteger(obj.addition));
}
export function isInstanceOfMainConfigUnit(obj) {
    if (!obj || typeof obj !== "object")
        return false;
    return "ip" in obj && typeof obj.ip === "string";
}
export function isInstanceOfMainConfigCamera(obj) {
    if (!obj || typeof obj !== "object")
        return false;
    return ("ip" in obj &&
        "username" in obj &&
        "password" in obj &&
        "updateDelay" in obj &&
        "cameraType" in obj &&
        typeof obj.ip === "string" &&
        typeof obj.username === "string" &&
        typeof obj.password === "string" &&
        typeof obj.cameraType === "string" &&
        ["dahua", "avtech", "vivotek"].includes(obj.cameraType) &&
        Number.isInteger(obj.updateDelay));
}
export function isInstanceOfMainConfigPc(obj) {
    if (!obj || typeof obj !== "object")
        return false;
    return ("os" in obj &&
        typeof obj.os === "string" &&
        ["windows", "ubuntu"].includes(obj.os));
}
export function isInstanceOfMainConfigApp(obj) {
    if (!obj || typeof obj !== "object")
        return false;
    return "password" in obj && typeof obj.password === "string";
}
