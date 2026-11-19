export interface EmailSettings {
  listener: "enabled" | "disabled";
  mode: "device" | "panel";
  host: string;
  user: string;
  password: string;
  senderOverride: string;
  unitRecipients: string;
  cameraRecipients: string;
}

export const defaultEmailSettings: EmailSettings = {
  listener: "enabled",
  mode: "device",
  host: "",
  user: "",
  password: "",
  senderOverride: "",
  unitRecipients: "",
  cameraRecipients: "",
};

export function emailSettings(config: any): EmailSettings {
  const value = config?.email;
  if (!value) return { ...defaultEmailSettings };
  const result = { ...defaultEmailSettings, ...value };
  for (const key of Object.keys(
    defaultEmailSettings
  ) as (keyof EmailSettings)[]) {
    if (typeof result[key] !== "string")
      throw new Error("Neplatné nastavení e-mailu.");
  }
  if (
    !["enabled", "disabled"].includes(result.listener) ||
    !["device", "panel"].includes(result.mode)
  ) {
    throw new Error("Neplatný režim e-mailu.");
  }
  return result;
}

export function addresses(value: string): string[] {
  const result = [...new Set(value.split(/[\s,;]+/).filter(Boolean))];
  if (result.length > 100 || result.some((v) => !mailbox(v))) {
    throw new Error(
      "Neplatný seznam adresátů. Použijte samostatné e-mailové adresy oddělené čárkou."
    );
  }
  return result;
}

export function mailbox(value: string): boolean {
  return (
    value.length <= 320 &&
    Array.from(value).every(
      (char) => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127
    ) &&
    /^[^\s@<>]+@[^\s@<>]+$/.test(value)
  );
}

export function normalizedIp(value: string): string {
  return value.replace(/^::ffff:/i, "");
}

export function sourceFor(
  config: any,
  ip: string
): "engine" | "thermal" | "camera" | undefined {
  const normalized = normalizedIp(ip);
  // Match actual peer addresses only: no reverse DNS, PROXY or SMTP XCLIENT trust.
  if (normalized === config?.units?.engine?.ip) return "engine";
  if (normalized === config?.units?.thermal?.ip) return "thermal";
  if (normalized === config?.camera?.ip) return "camera";
  return undefined;
}

export function supportedRuntime(version = process.versions.node): boolean {
  return Boolean(process.versions["bun"]) && version === process.versions.node || Number(version.split(".")[0]) >= 20;
}

export function diagnostic(error: any, settings: EmailSettings): string {
  let message = String(error?.response || error?.message || "Chyba SMTP");
  // Provider text is evidence, but must not contain configured authentication secrets.
  for (const secret of [
    settings.password,
    Buffer.from(settings.password).toString("base64"),
    Buffer.from(`\0${settings.user}\0${settings.password}`).toString("base64"),
  ]) {
    if (secret) message = message.split(secret).join("[skryto]");
  }
  return message
    .replace(/AUTH\s+\S+[^\r\n]*/gi, "AUTH [skryto]")
    .slice(0, 4000);
}
