/** Scheduling only: not connected to startup until receipt and delivery are ready. */
const MINUTE = 60_000;
export const EMAIL_QUEUE_LIMITS = {
  count: 100,
  bytes: 100 * 1024 * 1024,
  ttl: 24 * 60 * MINUTE,
};

export type DiscardReason = "evicted" | "expired";
export interface DiscardedEmail {
  id: number;
  receivedAt: number;
  reason: DiscardReason;
}

interface Entry {
  id: number;
  receivedAt: number;
  content: Buffer;
  attempts: number;
  dueAt: number;
  stopped: boolean;
  routePaused: boolean;
  testProbe: boolean;
}

export type AttemptResult =
  | "complete"
  | "permanent"
  | "temporary"
  | "connection"
  | "routing"
  | "configuration";

export function retryDelay(attempts: number): number {
  return [MINUTE, 5 * MINUTE, 10 * MINUTE][attempts - 1] ?? 30 * MINUTE;
}

/**
 * Single sender, bounded volatile content. The caller owns recipient outcomes and
 * persistent history. Every operation that removes waiting content returns its
 * disposition so the caller can record it. No timers, IO or monitoring imports.
 * `now` is injected in milliseconds so expiry/retry tests need no wall-clock wait.
 */
export class EmailQueue {
  private entries: Entry[] = [];
  private active: Entry | undefined;
  private sequence = 0;
  private cooldownUntil = 0;
  private connectionPaused = false;

  constructor(
    private readonly now: () => number = Date.now,
    private readonly limits = EMAIL_QUEUE_LIMITS
  ) {
    for (const value of [limits.count, limits.bytes, limits.ttl]) {
      if (!Number.isSafeInteger(value) || value <= 0) {
        throw new Error("Queue limits must be positive safe integers");
      }
    }
  }

  get size(): number {
    return this.entries.length;
  }

  get bytes(): number {
    return this.entries.reduce(
      (total, entry) => total + entry.content.length,
      0
    );
  }

  expire(): DiscardedEmail[] {
    const discarded: DiscardedEmail[] = [];
    const now = this.now();
    this.entries = this.entries.filter((entry) => {
      // Finish a send already in progress, including one crossing the TTL.
      if (entry !== this.active && now - entry.receivedAt >= this.limits.ttl) {
        discarded.push(this.disposition(entry, "expired"));
        return false;
      }
      return true;
    });
    return discarded;
  }

  enqueue(
    content: Buffer,
    receivedAt = this.now(),
    testProbe = false
  ): {
    id?: number;
    rejected?: "too-large" | "busy";
    discarded: DiscardedEmail[];
  } {
    // An oversized arrival must not evict the entire queue.
    if (content.length > this.limits.bytes) {
      return { rejected: "too-large", discarded: [] };
    }
    const discarded = this.expire();
    if (
      this.active &&
      (this.active.content.length + content.length > this.limits.bytes ||
        this.limits.count === 1)
    ) {
      return { rejected: "busy", discarded };
    }
    while (
      this.entries.length >= this.limits.count ||
      this.bytes + content.length > this.limits.bytes
    ) {
      const index = this.entries.findIndex((entry) => entry !== this.active);
      const [oldest] = this.entries.splice(index, 1);
      if (!oldest) throw new Error("Missing waiting email");
      discarded.push(this.disposition(oldest, "evicted"));
    }
    const entry: Entry = {
      id: ++this.sequence,
      receivedAt,
      content: Buffer.from(Uint8Array.from(content)),
      attempts: 0,
      dueAt: receivedAt,
      stopped: false,
      routePaused: false,
      testProbe,
    };
    this.entries.push(entry);
    return { id: entry.id, discarded };
  }

  take(): {
    message?: { id: number; receivedAt: number; content: Buffer };
    discarded: DiscardedEmail[];
  } {
    const discarded = this.expire();
    if (this.active || this.now() < this.cooldownUntil) {
      return { discarded };
    }
    const eligible = this.entries.filter(
      (entry) =>
        !entry.stopped &&
        !entry.routePaused &&
        entry.dueAt <= this.now() &&
        (!this.connectionPaused || entry.testProbe)
    );
    // Unattempted arrivals first. Among retries, newest receipt first as well.
    eligible.sort(
      (a, b) => Number(a.attempts > 0) - Number(b.attempts > 0) || b.id - a.id
    );
    const entry = eligible[0];
    if (!entry) return { discarded };
    this.active = entry;
    entry.testProbe = false;
    entry.attempts++;
    return {
      message: {
        id: entry.id,
        receivedAt: entry.receivedAt,
        content: Buffer.from(Uint8Array.from(entry.content)),
      },
      discarded,
    };
  }

  settle(id: number, result: AttemptResult): DiscardedEmail[] {
    const entry = this.active;
    if (!entry || entry.id !== id) throw new Error("No matching active email");
    this.active = undefined;
    if (result === "complete") {
      this.connectionPaused = false;
      this.entries = this.entries.filter((item) => item !== entry);
    } else {
      if (result === "permanent") entry.stopped = true;
      if (result === "routing") entry.routePaused = true;
      entry.dueAt = this.now() + retryDelay(entry.attempts);
      if (result === "connection") this.cooldownUntil = entry.dueAt;
      if (result === "configuration") this.connectionPaused = true;
    }
    return this.expire();
  }

  /** After a settings change or explicit operator retry; does not reset TTL. */
  resume(): void {
    this.connectionPaused = false;
    this.cooldownUntil = 0;
    for (const entry of this.entries) {
      entry.routePaused = false;
      entry.dueAt = this.now();
    }
  }

  retry(id: number): boolean {
    const entry = this.entries.find(
      (item) => item.id === id && item !== this.active
    );
    if (!entry || this.now() - entry.receivedAt >= this.limits.ttl)
      return false;
    entry.stopped = false;
    entry.routePaused = false;
    entry.dueAt = this.now();
    this.connectionPaused = false;
    this.cooldownUntil = 0;
    return true;
  }

  remove(id: number): boolean {
    const index = this.entries.findIndex(
      (item) => item.id === id && item !== this.active
    );
    if (index < 0) return false;
    this.entries.splice(index, 1);
    return true;
  }

  pending(): {
    id: number;
    receivedAt: number;
    bytes: number;
    attempts: number;
    dueAt: number;
    active: boolean;
    stopped: boolean;
    paused: boolean;
  }[] {
    return this.entries.map((entry) => ({
      id: entry.id,
      receivedAt: entry.receivedAt,
      bytes: entry.content.length,
      attempts: entry.attempts,
      dueAt: entry.dueAt,
      active: entry === this.active,
      stopped: entry.stopped,
      paused: entry.routePaused || (this.connectionPaused && !entry.testProbe),
    }));
  }

  private disposition(entry: Entry, reason: DiscardReason): DiscardedEmail {
    return { id: entry.id, receivedAt: entry.receivedAt, reason };
  }
}
