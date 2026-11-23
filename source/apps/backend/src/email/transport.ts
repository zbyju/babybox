import { type EmailSettings, diagnostic, mailbox, object } from "./settings.js";

export type FailureCategory =
  | "temporary"
  | "connection"
  | "configuration"
  | "permanent";

export function classifyFailure(error: unknown): FailureCategory {
  const failure = object(error) ? error : {};
  const code = typeof failure["code"] === "string" ? failure["code"] : "";
  const originalCode =
    typeof failure["originalCode"] === "string" ? failure["originalCode"] : "";
  const response = Number(failure["responseCode"]);
  if (response === 421) return "connection";
  if (code === "EAUTH" && response >= 400 && response < 500)
    return "connection";
  if (
    code === "EAUTH" ||
    code === "ETLS" ||
    /CERT|TLS|SSL|SELF_SIGNED|UNABLE_TO_VERIFY/.test(code + " " + originalCode)
  )
    return "configuration";
  if (
    [
      "ECONNECTION",
      "ECONNREFUSED",
      "ECONNRESET",
      "ETIMEDOUT",
      "ETIMEOUT",
      "EDNS",
      "ENOTFOUND",
      "EAI_AGAIN",
      "ESOCKET",
    ].includes(code)
  )
    return "connection";
  if (response >= 500 && response !== 503) return "permanent";
  return "temporary";
}

/** Adjust only address headers, retaining the MIME body/attachments byte for byte. */
export function routedContent(
  raw: Buffer,
  sender: string,
  recipients?: string[]
): Buffer {
  if (!sender && !recipients) return raw;
  const boundary = raw.indexOf("\r\n\r\n");
  if (boundary < 0 || boundary > 1024 * 1024)
    throw Object.assign(
      new Error("Neplatné nebo příliš velké hlavičky zprávy."),
      { responseCode: 550 }
    );
  const replace = new Set<string>();
  if (sender) replace.add("from");
  if (recipients) ["to", "cc", "bcc"].forEach((key) => replace.add(key));
  const fields = raw
    .subarray(0, boundary)
    .toString("latin1")
    .split(/\r\n(?![ \t])/);
  const kept = fields.filter(
    (field) => !replace.has(field.split(":", 1)[0]?.toLowerCase() ?? "")
  );
  if (sender) kept.push(`From: ${sender}`);
  if (recipients) kept.push(`To: ${recipients.join(", ")}`);
  return Buffer.concat([
    Uint8Array.from(Buffer.from(kept.join("\r\n") + "\r\n\r\n", "latin1")),
    Uint8Array.from(raw.subarray(boundary + 4)),
  ]);
}

type CreateTransport = (options: Record<string, unknown>) => {
  sendMail(message: {
    envelope: { from: string; to: string[] };
    raw: Buffer;
  }): Promise<{ response: string }>;
  close(): void;
};

function transportOptions(settings: EmailSettings) {
  if (
    !settings.host.trim() ||
    !settings.user ||
    !settings.password ||
    /[\r\n]/.test(settings.host)
  ) {
    throw Object.assign(
      new Error("Doplňte odchozí SMTP server, uživatele a heslo."),
      { code: "EAUTH" }
    );
  }
  return {
    host: settings.host.trim(),
    port: 465,
    secure: true,
    auth: { user: settings.user, pass: settings.password },
    tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" as const },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
    dnsTimeout: 10_000,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
  };
}

export async function verifySmtp(settings: EmailSettings): Promise<void> {
  const options = transportOptions(settings);
  const { default: nodemailer } = await import("nodemailer");
  const transport = nodemailer.createTransport(options);
  try {
    await transport.verify();
  } finally {
    transport.close();
  }
}

export async function submit(
  settings: EmailSettings,
  sender: string,
  recipient: string,
  raw: Buffer,
  createTransport?: CreateTransport
): Promise<string> {
  const options = transportOptions(settings);
  if ((sender && !mailbox(sender)) || !mailbox(recipient)) {
    throw Object.assign(new Error("Neplatný odesílatel nebo adresát."), {
      responseCode: 550,
    });
  }
  // Lazy load: deployed Node 18 panels must still boot and monitor normally.
  const connect: CreateTransport =
    createTransport ?? (await import("nodemailer")).default.createTransport;
  const transport = connect(options);
  try {
    const result = await transport.sendMail({
      envelope: { from: sender, to: [recipient] },
      raw,
    });
    return diagnostic({ response: result.response }, settings);
  } finally {
    transport.close();
  }
}
