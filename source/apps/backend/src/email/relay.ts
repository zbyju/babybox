import { fileURLToPath } from "node:url";
import * as path from "path";
import type { SMTPServer } from "smtp-server";

import {
  type EmailRecord,
  effectiveRecipients,
  EmailHistory,
} from "./history.js";
import { metadata } from "./metadata.js";
import {
  type AttemptResult,
  type DiscardedEmail,
  EmailQueue,
} from "./queue.js";
import {
  addresses,
  diagnostic,
  emailSettings,
  mailbox,
  object,
  type RelayConfig,
  sourceFor,
  supportedRuntime,
} from "./settings.js";
import { classifyFailure, routedContent, submit } from "./transport.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MAX_BYTES = 100 * 1024 * 1024;
function smtpError(message: string, responseCode = 451): Error {
  return Object.assign(new Error(message), { responseCode });
}

export class EmailRelay {
  private queue = new EmailQueue(() => Date.now());
  private records = new Map<number, EmailRecord>();
  private server: SMTPServer | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private busy = false;
  private receivingBytes = 0;
  private listener = "Příjem není spuštěn.";
  private error: string | null = null;
  private settingKey = "";
  private configurationError: string | null = null;
  private nextBindAt = 0;
  private started = false;
  private readonly ready: Promise<void>;
  private listenPort = 25;
  private listenHost = "0.0.0.0";
  readonly history: EmailHistory;

  constructor(
    private readonly getConfig: () => RelayConfig | null,
    directory = process.env["EMAIL_DATA_DIR"] ||
      path.resolve(
        __dirname,
        process.env["NODE_ENV"] === "production"
          ? "../../email-data"
          : "../../../../../email-data"
      ),
    private readonly send = submit,
    private readonly parse = metadata,
    private readonly runtime = process.versions.node
  ) {
    this.history = new EmailHistory(path.join(directory, "history.json"));
    this.ready = this.history.open();
  }

  async start(port = 25, host = "0.0.0.0"): Promise<void> {
    this.started = true;
    this.listenPort = port;
    this.listenHost = host;
    await this.ready;
    if (!supportedRuntime(this.runtime)) {
      this.error =
        "E-mail vyžaduje Bun nebo Node.js 20 a novější. Sledování babyboxu pokračuje.";
      return;
    }
    await this.tick();
    if (!this.started) return;
    this.timer = setInterval(() => {
      void this.tick().catch(() => {
        this.error = "Chyba e-mailov? slu?by. Sledov?n? babyboxu pokra?uje.";
      });
    }, 1000);
    this.timer.unref();
  }

  private async updateListener(enabled: boolean): Promise<void> {
    if (!this.started || !supportedRuntime(this.runtime)) return;
    if (!enabled) {
      const server = this.server;
      if (server?.server.listening)
        await new Promise<void>((resolve) => server.close(resolve));
      this.listener = "Příjem SMTP je vypnut?.";
      return;
    }
    if (this.server?.server.listening || Date.now() < this.nextBindAt) return;
    this.nextBindAt = Date.now() + 30_000;
    try {
      await this.listen(this.listenPort, this.listenHost);
    } catch (error) {
      const code = object(error) ? error["code"] : undefined;
      const port = this.listenPort;
      if (code === "EACCES" || code === "EPERM")
        this.listener = `Příjem SMTP nelze spustit. Panel nemá oprávnění naslouchat na portu ${port} (${code}).`;
      else if (code === "EADDRINUSE")
        this.listener = `Příjem SMTP nelze spustit. Port ${port} je obsazený (EADDRINUSE).`;
      else
        this.listener = `Příjem SMTP nelze spustit. Zkontrolujte port ${port} a oprávnění.`;
    }
  }

  private async listen(port: number, host: string): Promise<void> {
    const smtp = await import("smtp-server");
    const server = new smtp.SMTPServer({
      name: "babybox-panel",
      banner: "Babybox SMTP",
      secure: false,
      disabledCommands: ["STARTTLS", "XCLIENT", "XFORWARD"],
      authOptional: true,
      allowInsecureAuth: true,
      authMethods: ["PLAIN", "LOGIN"],
      logger: false,
      disableReverseLookup: true,
      size: MAX_BYTES,
      maxClients: 10,
      socketTimeout: 30_000,
      closeTimeout: 1000,
      onConnect: (session, done) =>
        done(
          this.allowed(session.remoteAddress)
            ? undefined
            : smtpError("Zdroj není povolen.", 554)
        ),
      // Source credentials establish no upstream identity and are never logged/stored.
      onAuth: (_auth, session, done) =>
        done(
          this.allowed(session.remoteAddress)
            ? null
            : smtpError("Zdroj není povolen.", 535),
          { user: "device" }
        ),
      onMailFrom: (_address, session, done) =>
        done(
          this.allowed(session.remoteAddress)
            ? undefined
            : smtpError("Zdroj není povolen.", 554)
        ),
      onRcptTo: (_address, session, done) =>
        done(
          session.envelope.rcptTo.length >= 100
            ? smtpError("Příliš mnoho adresátů.", 452)
            : undefined
        ),
      onData: (stream, session, done) => {
        let size = 0;
        let chunks: Buffer[] = [];
        let rejected = false;
        let completed = false;
        const finish = (error?: Error | null) => {
          if (!completed) {
            completed = true;
            this.receivingBytes -= size;
            done(error);
          }
        };
        stream.on("data", (chunk: Buffer) => {
          if (completed || rejected) return;
          if (
            size + chunk.length > MAX_BYTES ||
            this.receivingBytes + chunk.length > MAX_BYTES
          ) {
            rejected = true;
            chunks = [];
          } else {
            size += chunk.length;
            this.receivingBytes += chunk.length;
            chunks.push(chunk);
          }
        });
        stream.once("error", () => finish(smtpError("Příjem zprávy selhal.")));
        stream.once("end", () => {
          if (rejected || stream.sizeExceeded) {
            finish(smtpError("Zpráva překračuje dostupnou kapacitu.", 452));
            return;
          }
          const raw = Buffer.concat(
            chunks.map((chunk) => Uint8Array.from(chunk))
          );
          chunks = [];
          const envelope = session.envelope;
          void this.receive(
            session.remoteAddress,
            envelope.mailFrom ? envelope.mailFrom.address : "",
            envelope.rcptTo.map((r) => r.address),
            raw
          ).then(
            () => finish(),
            () =>
              finish(
                smtpError(
                  "Zprávu nelze přijmout. Zkontrolujte stav e-mailové služby."
                )
              )
          );
        });
      },
    });
    this.server = server;
    server.on("error", () => {
      this.listener = "Chyba příjmu SMTP. Zkontrolujte port a oprávnění.";
    });
    return new Promise((resolve, reject) => {
      const failed = (error: Error) => reject(error);
      server.once("error", failed);
      server.listen(port, host, () => {
        server.removeListener("error", failed);
        const address = server.server.address();
        this.listener = `SMTP naslouchá na portu ${
          address && typeof address === "object" ? address.port : port
        }.`;
        resolve();
      });
    });
  }

  private allowed(ip: string): boolean {
    try {
      return (
        emailSettings(this.getConfig()).listener === "enabled" &&
        Boolean(sourceFor(this.getConfig(), ip))
      );
    } catch {
      return false;
    }
  }

  async receive(
    ip: string,
    sender: string,
    recipients: string[],
    raw: Buffer,
    test = false
  ): Promise<string> {
    await this.ready;
    const source = test ? "test" : sourceFor(this.getConfig(), ip);
    if (
      !source ||
      (!test && !this.allowed(ip)) ||
      !supportedRuntime(this.runtime)
    )
      throw smtpError("Zdroj není povolen.", 554);
    if (
      !recipients.length ||
      recipients.length > 100 ||
      recipients.some((r) => !mailbox(r)) ||
      (sender && !mailbox(sender))
    )
      throw smtpError("Neplatná obálka.", 550);
    if (raw.length > MAX_BYTES) throw smtpError("Zpráva je příliš velká.", 552);
    const receivedAt = Date.now();
    const detail = await this.parse(raw);
    // Device settings may have changed while MIME parsing was running.
    if (!test && !this.allowed(ip))
      throw smtpError("Zdroj již není povolen.", 554);
    const admitted = this.queue.enqueue(raw, receivedAt, test);
    this.discard(admitted.discarded);
    if (admitted.id === undefined)
      throw smtpError("Fronta nemá dostatečnou kapacitu.", 452);
    const record = this.history.create({
      source,
      sourceIp: test ? "panel" : ip,
      sender,
      requestedRecipients: recipients,
      receivedAt,
      bytes: raw.length,
      ...detail,
    });
    this.records.set(admitted.id, record);
    await this.history.save();
    return record.id;
  }

  async tick(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    let activeId: number | undefined;
    try {
      const expired = this.queue.expire();
      this.discard(expired);
      if (expired.length) await this.history.save();

      let settings;
      try {
        settings = emailSettings(this.getConfig());
      } catch {
        this.configurationError =
          "Neplatné nastavení e-mailu. Sledování babyboxu pokračuje.";
        this.settingKey = "";
        await this.updateListener(false);
        return;
      }
      this.configurationError = null;
      const key = JSON.stringify(settings);
      if (key !== this.settingKey) {
        this.settingKey = key;
        this.error = null;
        this.queue.resume();
        this.nextBindAt = 0;
      }
      await this.updateListener(settings.listener === "enabled");
      const taken = this.queue.take();
      this.discard(taken.discarded);
      if (!taken.message) {
        if (taken.discarded.length) await this.history.save();
        return;
      }
      activeId = taken.message.id;
      const record = this.records.get(activeId);
      if (!record) throw new Error("Missing email record");
      let result: AttemptResult = "complete";
      try {
        const requested =
          settings.mode === "device" || record.source === "test"
            ? record.requestedRecipients
            : addresses(
                record.source === "camera"
                  ? settings.cameraRecipients
                  : settings.unitRecipients
              );
        if (!requested.length)
          throw Object.assign(new Error("Seznam adresátů je prázdný."), {
            code: "EAUTH",
          });
        if (settings.senderOverride && !mailbox(settings.senderOverride))
          throw Object.assign(new Error("Neplatný náhradní odesílatel."), {
            code: "EAUTH",
          });
        const targets = effectiveRecipients(record, requested);
        for (const address of requested)
          if (!record.recipients[address])
            record.recipients[address] = "pending";
        const raw = routedContent(
          taken.message.content,
          settings.senderOverride,
          settings.mode === "panel" && record.source !== "test"
            ? requested
            : undefined
        );
        for (const recipient of targets) {
          this.history.event(record, "attempt", `Odeslání: ${recipient}`);
          await this.history.save();
          try {
            const response = await this.send(
              settings,
              settings.senderOverride || record.sender,
              recipient,
              raw
            );
            record.recipients[recipient] = "accepted";
            this.history.event(record, "accepted", `${recipient}: ${response}`);
            this.error = null;
          } catch (error) {
            const category = classifyFailure(error);
            const detail = diagnostic(error, settings);
            this.error = detail;
            record.recipients[recipient] =
              category === "permanent" ? "permanent" : "temporary";
            this.history.event(record, category, `${recipient}: ${detail}`);
            if (category === "connection" || category === "configuration") {
              result = category;
              break;
            }
            if (category === "temporary") result = "temporary";
          }
          await this.history.save();
        }
        if (result === "complete") {
          const failed = requested.some(
            (recipient) => record.recipients[recipient] === "permanent"
          );
          result = failed ? "permanent" : "complete";
          record.status = failed ? "failed" : "accepted";
          if (!failed) record.contentAvailable = false;
        }
      } catch (error) {
        result =
          object(error) && Number(error["responseCode"]) >= 500
            ? "permanent"
            : "routing";
        if (result === "permanent") record.status = "failed";
        this.error = diagnostic(error, settings);
        this.history.event(
          record,
          result === "routing" ? "configuration" : result,
          this.error
        );
      }
      this.discard(this.queue.settle(activeId, result));
      if (result === "temporary" || result === "connection") {
        const pending = this.queue
          .pending()
          .find((entry) => entry.id === activeId);
        if (pending)
          this.history.event(
            record,
            "retry-scheduled",
            `Další automatický pokus nejdříve ${new Date(
              pending.dueAt
            ).toISOString()}.`
          );
      } else if (result === "configuration" || result === "routing") {
        this.history.event(
          record,
          "paused",
          "Odesílání pozastaveno do změny nastavení nebo ručního opakování."
        );
      }
      if (result === "complete") this.records.delete(activeId);
      activeId = undefined;
      await this.history.save();
    } finally {
      if (activeId !== undefined)
        this.discard(this.queue.settle(activeId, "temporary"));
      this.busy = false;
    }
  }

  private discard(items: DiscardedEmail[]): void {
    for (const item of items) {
      const record = this.records.get(item.id);
      if (record) {
        record.status = item.reason;
        record.contentAvailable = false;
        this.history.event(
          record,
          item.reason,
          item.reason === "expired"
            ? "Vypršela platnost zprávy (24 hodin)."
            : "Obsah byl odstraněn kvůli kapacitě fronty."
        );
        this.records.delete(item.id);
      }
    }
  }

  status() {
    let configured = false;
    let settingsChanged = false;
    try {
      const settings = emailSettings(this.getConfig());
      configured = Boolean(settings.host && settings.user && settings.password);
      settingsChanged = JSON.stringify(settings) !== this.settingKey;
    } catch {
      /* reported by tick */
    }
    return {
      listener: this.listener,
      error:
        settingsChanged && supportedRuntime(this.runtime)
          ? null
          : (this.configurationError ?? this.error),
      historyError: this.history.error,
      runtimeSupported: supportedRuntime(this.runtime),
      configured,
      queue: this.queue.pending().map((item) => ({
        ...item,
        id: this.records.get(item.id)?.id,
        subject: this.records.get(item.id)?.subject,
      })),
      bytes: this.queue.bytes,
      history: this.history.list(),
    };
  }

  async action(
    action: "retry" | "delete" | "clear",
    ids: string[] = []
  ): Promise<number> {
    this.discard(this.queue.expire());
    let changed = 0;
    for (const [queueId, record] of this.records) {
      if (action !== "clear" && !ids.includes(record.id)) continue;
      if (action === "retry") {
        if (!this.queue.retry(queueId)) continue;
        for (const address of Object.keys(record.recipients))
          if (record.recipients[address] === "permanent")
            record.recipients[address] = "pending";
        record.status = "pending";
        this.history.event(
          record,
          "manual-retry",
          "Obsluha vyžádala opakování nedokončených adresátů."
        );
      } else {
        if (!this.queue.remove(queueId)) continue;
        record.status = "deleted";
        record.contentAvailable = false;
        this.history.event(record, "deleted", "Obsah odstraněn obsluhou.");
        this.records.delete(queueId);
      }
      changed++;
    }
    await this.history.save();
    return changed;
  }

  async test(recipient: string): Promise<string> {
    const settings = emailSettings(this.getConfig());
    if (!mailbox(recipient)) throw new Error("Neplatný adresát testu.");
    const sender = settings.senderOverride || settings.user;
    if (!mailbox(sender))
      throw new Error("Pro test vyplňte platného náhradního odesílatele.");
    const raw = Buffer.from(
      `From: ${sender}\r\nTo: ${recipient}\r\nSubject: Babybox - test e-mailu\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nTest odeslani e-mailu z panelu Babybox.\r\n`
    );
    return this.receive("", sender, [recipient], raw, true);
  }

  async close(): Promise<void> {
    this.started = false;
    await this.ready;
    if (this.timer) clearInterval(this.timer);
    const server = this.server;
    if (server?.server.listening)
      await new Promise<void>((resolve) => server.close(resolve));
    await this.history.save();
  }
}
