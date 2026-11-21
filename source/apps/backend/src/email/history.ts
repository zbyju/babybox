import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import * as path from "path";

import { object } from "./settings.js";

export type RecipientStatus =
  | "pending"
  | "accepted"
  | "temporary"
  | "permanent";
export type EmailStatus =
  | "pending"
  | "accepted"
  | "failed"
  | "expired"
  | "evicted"
  | "deleted"
  | "interrupted";
export interface EmailRecord {
  id: string;
  receivedAt: number;
  source: string;
  sourceIp?: string;
  sender: string;
  requestedRecipients: string[];
  recipients: Record<string, RecipientStatus>;
  subject: string;
  text: string;
  headers: string;
  attachments: { filename: string; contentType: string; size: number }[];
  bytes: number;
  status: EmailStatus;
  contentAvailable: boolean;
  events: { at: number; kind: string; detail: string }[];
}

export function effectiveRecipients(
  record: EmailRecord,
  requested: string[]
): string[] {
  return [...new Set(requested)].filter(
    (address) =>
      record.recipients[address] !== "accepted" &&
      record.recipients[address] !== "permanent"
  );
}

/** No MIME bytes or authentication data belong in this store. */
export class EmailHistory {
  private records: EmailRecord[] = [];
  private writing: Promise<void> = Promise.resolve();
  private writable = true;
  error: string | null = null;

  constructor(
    private readonly file: string,
    private readonly now = Date.now
  ) {}

  async open(): Promise<void> {
    try {
      const data: unknown = JSON.parse(await fs.readFile(this.file, "utf8"));
      if (
        !Array.isArray(data) ||
        data.length > 100 ||
        !data.every(validRecord)
      ) {
        throw new Error("Invalid history");
      }
      this.records = data;
      for (const record of this.records) {
        if (record.contentAvailable) {
          record.contentAvailable = false;
          if (record.status === "pending") record.status = "interrupted";
          record.events.push({
            at: this.now(),
            kind: "restart",
            detail: "Obsah zprávy byl ztracen restartem; opakování není možné.",
          });
        }
      }
      await this.save();
    } catch (error) {
      if (!object(error) || error["code"] !== "ENOENT") {
        // Preserve corrupt/unreadable evidence rather than replacing it with [].
        this.writable = false;
        this.error = "Historii nelze načíst; původní soubor zůstal zachován.";
      }
    }
  }

  create(
    input: Omit<
      EmailRecord,
      "id" | "status" | "contentAvailable" | "events" | "recipients"
    >
  ): EmailRecord {
    const record: EmailRecord = {
      ...input,
      id: randomUUID(),
      recipients: Object.create(null),
      status: "pending",
      contentAvailable: true,
      events: [
        {
          at: input.receivedAt,
          kind: "received",
          detail: "Zpráva přijata panelem.",
        },
      ],
    };
    this.records.push(record);
    this.records = this.records.slice(-100);
    return record;
  }

  event(record: EmailRecord, kind: string, detail: string): void {
    record.events.push({ at: this.now(), kind, detail });
  }

  list(): EmailRecord[] {
    return JSON.parse(JSON.stringify(this.records.slice().reverse()));
  }

  save(): Promise<void> {
    const snapshot = JSON.stringify(this.records);
    this.writing = this.writing.then(async () => {
      if (!this.writable) return;
      const temporary = this.file + ".tmp";
      try {
        await fs.mkdir(path.dirname(this.file), { recursive: true });
        const handle = await fs.open(temporary, "w", 0o600);
        try {
          await handle.writeFile(snapshot, "utf8");
          await handle.sync();
        } finally {
          await handle.close();
        }
        await fs.rename(temporary, this.file);
        if (process.platform !== "win32") {
          const directory = await fs.open(path.dirname(this.file), "r");
          try {
            await directory.sync();
          } finally {
            await directory.close();
          }
        }
        this.error = null;
      } catch {
        this.error = "Historii nelze uložit. Sledování babyboxu pokračuje.";
      }
    });
    return this.writing;
  }
}

function validRecord(value: unknown): value is EmailRecord {
  return (
    object(value) &&
    typeof value["id"] === "string" &&
    Number.isFinite(value["receivedAt"]) &&
    typeof value["source"] === "string" &&
    typeof value["sender"] === "string" &&
    Array.isArray(value["requestedRecipients"]) &&
    value["requestedRecipients"].every((v: unknown) => typeof v === "string") &&
    object(value["recipients"]) &&
    Object.values(value["recipients"]).every((v) =>
      ["pending", "accepted", "temporary", "permanent"].includes(String(v))
    ) &&
    typeof value["subject"] === "string" &&
    typeof value["text"] === "string" &&
    typeof value["headers"] === "string" &&
    Array.isArray(value["attachments"]) &&
    value["attachments"].every(
      (a: unknown) =>
        object(a) &&
        typeof a["filename"] === "string" &&
        typeof a["contentType"] === "string" &&
        Number.isFinite(a["size"])
    ) &&
    Number.isFinite(value["bytes"]) &&
    typeof value["contentAvailable"] === "boolean" &&
    [
      "pending",
      "accepted",
      "failed",
      "expired",
      "evicted",
      "deleted",
      "interrupted",
    ].some((status) => status === value["status"]) &&
    Array.isArray(value["events"]) &&
    value["events"].every(
      (e: unknown) =>
        object(e) &&
        Number.isFinite(e["at"]) &&
        typeof e["kind"] === "string" &&
        typeof e["detail"] === "string"
    )
  );
}
