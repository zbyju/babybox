import assert from "node:assert/strict";
import { promises as fs } from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { effectiveRecipients, EmailHistory } from "./history.js";

describe("persistent email lifecycle", () => {
  let dir: string;
  let file: string;
  const input = {
    receivedAt: 10,
    source: "engine",
    sender: "unit@example.com",
    requestedRecipients: ["a@example.com"],
    subject: "Alarm",
    text: "Door",
    headers: "Subject: Alarm",
    attachments: [
      { filename: "camera.jpg", contentType: "image/jpeg", size: 123 },
    ],
    bytes: 456,
  };
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "babybox-email-"));
    file = path.join(dir, "history.json");
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("retains 100 emails with their complete lifecycle, not 100 individual events", async () => {
    const history = new EmailHistory(file);
    await history.open();
    for (let i = 0; i < 101; i++) {
      const record = history.create({ ...input, subject: String(i) });
      for (let j = 0; j < 110; j++) history.event(record, "attempt", String(j));
    }
    await history.save();
    expect(history.list()).toHaveLength(100);
    expect(history.list()[0]?.subject).toBe("100");
    expect(history.list()[99]?.subject).toBe("1");
    expect(history.list()[99]?.events).toHaveLength(111);
  });

  it("marks volatile content lost on restart without losing accepted recipients", async () => {
    const history = new EmailHistory(file, () => 20);
    const record = history.create(input);
    record.recipients["a@example.com"] = "accepted";
    history.event(record, "accepted", "250 queued");
    await history.save();
    const restarted = new EmailHistory(file, () => 30);
    await restarted.open();
    const saved = restarted.list()[0];
    assert(saved);
    expect(saved.id).toBe(record.id);
    expect(saved.status).toBe("interrupted");
    expect(saved.contentAvailable).toBe(false);
    expect(saved.recipients["a@example.com"]).toBe("accepted");
    expect(saved.events.map((e) => e.kind)).toEqual([
      "received",
      "accepted",
      "restart",
    ]);
    expect(saved.attachments).toEqual(input.attachments);
  });

  it("never automatically resends completed or permanently rejected recipients after routing changes", () => {
    const record = new EmailHistory(file).create(input);
    record.recipients = { a: "accepted", b: "permanent", c: "temporary" };
    expect(effectiveRecipients(record, ["a", "b", "c", "d", "d"])).toEqual([
      "c",
      "d",
    ]);
  });

  it("serializes concurrent writes so a slower old snapshot cannot replace a newer one", async () => {
    const history = new EmailHistory(file);
    const record = history.create(input);
    const first = history.save();
    history.event(record, "attempt", "second");
    await Promise.all([first, history.save()]);
    expect(JSON.parse(await fs.readFile(file, "utf8"))[0].events).toHaveLength(
      2
    );
  });

  it("keeps corrupt history untouched and exposes failure without throwing into monitoring", async () => {
    await fs.writeFile(file, "broken");
    const history = new EmailHistory(file);
    await history.open();
    history.create(input);
    await history.save();
    expect(history.error).toBeTruthy();
    expect(await fs.readFile(file, "utf8")).toBe("broken");
  });

  it("exposes write failure and allows recovery", async () => {
    const blocked = path.join(dir, "blocked");
    await fs.writeFile(blocked, "file");
    const history = new EmailHistory(path.join(blocked, "history.json"));
    history.create(input);
    await history.save();
    expect(history.error).toBeTruthy();
    await fs.unlink(blocked);
    await history.save();
    expect(history.error).toBeNull();
  });
});
