import { promises as fs } from "fs";
import * as net from "net";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { metadata } from "./metadata.js";
import { EmailQueue } from "./queue.js";
import { EmailRelay } from "./relay.js";
import {
  defaultEmailSettings,
  diagnostic,
  sourceFor,
  supportedRuntime,
} from "./settings.js";
import { classifyFailure, routedContent } from "./transport.js";

const raw = Buffer.from(
  "From: unit@example.com\r\nTo: a@example.com\r\nCc: old@example.com\r\nSubject: Alarm\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=sample\r\n\r\n--sample\r\nContent-Type: text/plain\r\n\r\nDoor opened\r\n--sample\r\nContent-Type: image/jpeg\r\nContent-Disposition: attachment; filename=camera.jpg\r\nContent-Transfer-Encoding: base64\r\n\r\nAQIDBA==\r\n--sample--\r\n"
);
const parsed = {
  subject: "Alarm",
  text: "Door opened",
  headers: "Subject: Alarm",
  attachments: [{ filename: "camera.jpg", contentType: "image/jpeg", size: 4 }],
};

describe("email relay isolation and recipient tracking", () => {
  let dir: string;
  let config: any;
  let send: ReturnType<typeof vi.fn<typeof import("./transport.js").submit>>;
  let relay: EmailRelay;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "babybox-relay-"));
    config = {
      units: { engine: { ip: "127.0.0.1" }, thermal: { ip: "127.0.0.2" } },
      camera: { ip: "127.0.0.3" },
      email: {
        ...defaultEmailSettings,
        host: "smtp.example.com",
        user: "sender@example.com",
        password: "secret",
      },
    };
    send = vi.fn<typeof import("./transport.js").submit>().mockResolvedValue("250 accepted");
    relay = new EmailRelay(
      () => config,
      dir,
      send,
      async () => parsed,
      "24.22.2"
    );
  });
  afterEach(async () => {
    await relay.close();
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("keeps old panels running without importing unsupported SMTP libraries", async () => {
    const old = new EmailRelay(
      () => config,
      dir,
      send,
      async () => parsed,
      "18.12.1"
    );
    await old.start();
    expect(old.status().runtimeSupported).toBe(false);
    expect(old.status().error).toMatch(/Node.js/);
    expect(send).not.toHaveBeenCalled();
    await old.close();
  });

  it("accepts only configured source IPs, including IPv4 mapped peers", async () => {
    expect(sourceFor(config, "::ffff:127.0.0.1")).toBe("engine");
    await expect(
      relay.receive("192.0.2.1", "unit@example.com", ["a@example.com"], raw)
    ).rejects.toThrow();
    await relay.receive(
      "127.0.0.1",
      "unit@example.com",
      ["a@example.com"],
      raw
    );
    config.units.engine.ip = "127.0.0.4";
    await expect(
      relay.receive("127.0.0.1", "unit@example.com", ["a@example.com"], raw)
    ).rejects.toThrow();
  });

  it("preserves raw MIME bytes in device mode", async () => {
    await relay.receive(
      "127.0.0.1",
      "unit@example.com",
      ["a@example.com"],
      raw
    );
    await relay.tick();
    expect(send.mock.calls[0]!.slice(1)).toEqual([
      "unit@example.com",
      "a@example.com",
      raw,
    ]);
    expect(relay.status().history[0]!.status).toBe("accepted");
    expect(relay.status().queue).toHaveLength(0);
  });

  it("never resends accepted recipients after temporary/permanent failures, even on explicit retry", async () => {
    send.mockImplementation(async (_s, _f, recipient) => {
      if (recipient === "b@example.com")
        throw Object.assign(new Error("550 rejected"), { responseCode: 550 });
      return "250 accepted";
    });
    const id = await relay.receive(
      "127.0.0.1",
      "unit@example.com",
      ["a@example.com", "b@example.com"],
      raw
    );
    await relay.tick();
    expect(relay.status().history[0]!.status).toBe("failed");
    expect(relay.status().queue[0]!.stopped).toBe(true);
    await relay.tick();
    expect(send).toHaveBeenCalledTimes(2);
    send.mockResolvedValue("250 accepted");
    await relay.action("retry", [id]);
    await relay.tick();
    expect(send).toHaveBeenCalledTimes(3);
    expect(send.mock.calls[2]![2]).toBe("b@example.com");
    expect(relay.status().history[0]!.status).toBe("accepted");
  });

  it("uses current routing while retaining completed recipients and original facts", async () => {
    config.email.mode = "panel";
    config.email.unitRecipients = "a@example.com,b@example.com";
    send
      .mockImplementationOnce(async () => "250 accepted")
      .mockRejectedValueOnce(
        Object.assign(new Error("451 later"), { responseCode: 451 })
      );
    await relay.receive(
      "127.0.0.1",
      "unit@example.com",
      ["original@example.com"],
      raw
    );
    await relay.tick();
    config.email.unitRecipients = "a@example.com,c@example.com";
    send.mockResolvedValue("250 accepted");
    await relay.tick();
    expect(send.mock.calls.map((call) => call[2])).toEqual([
      "a@example.com",
      "b@example.com",
      "c@example.com",
    ]);
    expect(relay.status().history[0]!.requestedRecipients).toEqual([
      "original@example.com",
    ]);
  });

  it("queues without outbound settings, then delivers after settings change", async () => {
    send.mockRejectedValueOnce(
      Object.assign(new Error("missing settings"), { code: "EAUTH" })
    );
    await relay.receive(
      "127.0.0.1",
      "unit@example.com",
      ["a@example.com"],
      raw
    );
    await relay.tick();
    await relay.tick();
    expect(send).toHaveBeenCalledTimes(1);
    config.email.password = "new-secret";
    await relay.tick();
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("expires queued content while stored email settings are invalid", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      await relay.receive("127.0.0.1", "unit@example.com", ["a@example.com"], raw);
      config.email = [];
      vi.setSystemTime(Date.now() + 24 * 60 * 60 * 1000);
      await relay.tick();
      expect(relay.status().configured).toBe(false);
      expect(relay.status().error).toMatch(/nastavení/);
      expect(relay.status().queue).toHaveLength(0);
      expect(relay.status().history[0]?.status).toBe("expired");
      expect(send).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("continues delivery when history cannot be written", async () => {
    await fs.mkdir(path.join(dir, "history.json.tmp"));
    await relay.receive("127.0.0.1", "unit@example.com", ["a@example.com"], raw);
    await relay.tick();
    expect(send).toHaveBeenCalledTimes(1);
    expect(relay.status().historyError).toBeTruthy();
    expect(relay.status().history[0]?.status).toBe("accepted");
  });

  it("deletes waiting content and refuses to retry nonexistent or restart-lost content", async () => {
    const id = await relay.receive(
      "127.0.0.1",
      "unit@example.com",
      ["a@example.com"],
      raw
    );
    expect(await relay.action("delete", [id])).toBe(1);
    expect(await relay.action("retry", [id])).toBe(0);
    expect(relay.status().history[0]!.status).toBe("deleted");
    expect(relay.status().history[0]!.contentAvailable).toBe(false);
  });

  it("retains content for manual retry of a definitive failure and preserves original TTL", () => {
    let now = 0;
    const queue = new EmailQueue(() => now, { count: 2, bytes: 10, ttl: 100 });
    const id = queue.enqueue(Buffer.from("x")).id!;
    queue.take();
    queue.settle(id, "permanent");
    queue.resume();
    expect(queue.take().message).toBeUndefined();
    expect(queue.retry(id)).toBe(true);
    expect(queue.take().message!.id).toBe(id);
    queue.settle(id, "permanent");
    now = 100;
    expect(queue.retry(id)).toBe(false);
    expect(queue.expire()[0]!.reason).toBe("expired");
  });

  it("keeps explicit test recipients separate from panel routing", async () => {
    config.email.mode = "panel";
    config.email.unitRecipients = "fleet@example.com";
    config.email.listener = "disabled";
    await relay.test("test@example.com");
    await relay.tick();
    expect(send.mock.calls.map((call) => call[2])).toEqual([
      "test@example.com",
    ]);
  });

  it("preserves attachments when rewriting address headers", () => {
    const routed = routedContent(raw, "sender@example.com", [
      "new@example.com",
    ]);
    expect(routed.toString()).toContain("To: new@example.com\r\n");
    expect(routed.toString()).not.toContain("Cc: old@example.com");
    expect(routed.subarray(routed.indexOf("\r\n\r\n") + 4)).toEqual(
      raw.subarray(raw.indexOf("\r\n\r\n") + 4)
    );
  });

  it("classifies security and recipient failures and redacts SMTP secrets", () => {
    expect(classifyFailure({ code: "EAUTH" })).toBe("configuration");
    expect(classifyFailure({ code: "EAUTH", responseCode: 454 })).toBe("connection");
    expect(classifyFailure({ code: "CERT_HAS_EXPIRED" })).toBe("configuration");
    expect(classifyFailure({ code: "ETIMEDOUT" })).toBe("connection");
    expect(classifyFailure({ responseCode: 550 })).toBe("permanent");
    expect(classifyFailure({ responseCode: 450 })).toBe("temporary");
    expect(
      diagnostic({ message: "secret AUTH LOGIN c2VjcmV0" }, config.email)
    ).not.toMatch(/secret|c2VjcmV0/);
  });

  const onCurrentRuntime = supportedRuntime() ? it : it.skip;
  onCurrentRuntime(
    "parses attachment metadata in a worker without retaining attachment bytes",
    async () => {
      const result = await metadata(raw);
      expect(result.subject).toBe("Alarm");
      expect(result.attachments).toEqual(parsed.attachments);
      expect(JSON.stringify(result)).not.toContain("AQIDBA==");
    }
  );

  onCurrentRuntime.each(["none", "PLAIN", "LOGIN"])(
    "accepts real SMTP (device AUTH: %s) and survives an occupied port",
    async (auth) => {
      await relay.start(0, "127.0.0.1");
      const port = Number(relay.status().listener.match(/portu (\d+)/)?.[1]);
      const socket = net.connect(port, "127.0.0.1");
      socket.setEncoding("utf8");
      const responses: string[] = [];
      await new Promise<void>((resolve, reject) => {
        let buffer = "";
        let stage = 0;
        const password = Buffer.from("device-password").toString("base64");
        const authCommands = {
          none: [],
          PLAIN: [`AUTH PLAIN ${Buffer.from("\0device\0device-password").toString("base64")}\r\n`],
          LOGIN: [
            "AUTH LOGIN\r\n",
            Buffer.from("device").toString("base64") + "\r\n",
            password + "\r\n",
          ],
        };
        const commands = [
          "EHLO test\r\n",
          ...authCommands[auth as keyof typeof authCommands],
          "MAIL FROM:<unit@example.com>\r\n",
          "RCPT TO:<a@example.com>\r\n",
          "DATA\r\n",
          raw.toString() + ".\r\n",
          "QUIT\r\n",
        ];
        socket.on("error", reject);
        socket.on("data", (chunk) => {
          buffer += chunk;
          if (!/\d{3} [^\r\n]*\r\n$/.test(buffer)) return;
          responses.push(buffer);
          if (stage === commands.length) {
            socket.end();
            resolve();
            return;
          }
          socket.write(commands[stage++]!);
          buffer = "";
        });
      });
      if (auth === "PLAIN") expect(responses[2]).toMatch(/^235 /);
      if (auth === "LOGIN") {
        expect(responses.slice(2, 5).map((line) => line.slice(0, 3))).toEqual([
          "334", "334", "235",
        ]);
      }
      expect(responses[responses.length - 3]).toMatch(/^354 /);
      expect(responses[responses.length - 2]).toMatch(/^250 /);
      expect(JSON.stringify(relay.status().history)).not.toContain(
        "device-password"
      );
      expect(relay.status().history).toHaveLength(1);
      const blocked = new EmailRelay(
        () => config,
        path.join(dir, "blocked"),
        send,
        async () => parsed,
        "24.22.2"
      );
      await blocked.start(port, "127.0.0.1");
      expect(blocked.status().listener).toMatch(/nelze spustit/);
      await relay.close();
      vi.useFakeTimers({ toFake: ["Date"] });
      try {
        vi.setSystemTime(Date.now() + 30_000);
        await blocked.tick();
        expect(blocked.status().listener).toContain(`portu ${port}`);
      } finally {
        vi.useRealTimers();
        await blocked.close();
      }
    }
  );
});
