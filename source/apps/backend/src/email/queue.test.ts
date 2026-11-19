import { EMAIL_QUEUE_LIMITS, EmailQueue, retryDelay } from "./queue";

describe("email content scheduling", () => {
  let now: number;
  beforeEach(() => {
    now = 0;
  });
  const content = (size = 1) => Buffer.alloc(size, "x");

  it("bounds the pending count and reports the oldest waiting eviction", () => {
    const queue = new EmailQueue(() => now);
    for (let i = 0; i < 100; i++) queue.enqueue(content());
    expect(queue.enqueue(content()).discarded).toEqual([
      { id: 1, receivedAt: 0, reason: "evicted" },
    ]);
    expect(queue.size).toBe(100);
  });

  it("bounds bytes independently of count and rejects oversized messages without eviction", () => {
    const queue = new EmailQueue(() => now, {
      count: 100,
      bytes: 10,
      ttl: 1000,
    });
    queue.enqueue(content(6));
    expect(queue.enqueue(content(11))).toEqual({
      rejected: "too-large",
      discarded: [],
    });
    expect(queue.bytes).toBe(6);
    expect(queue.enqueue(content(5)).discarded[0].reason).toBe("evicted");
    expect(queue.bytes).toBe(5);
  });

  it("keeps active content in capacity accounting and never evicts it", () => {
    const queue = new EmailQueue(() => now, { count: 2, bytes: 10, ttl: 1000 });
    queue.enqueue(content(6));
    queue.take();
    queue.enqueue(content(2));
    expect(queue.enqueue(content(5))).toEqual({
      rejected: "busy",
      discarded: [],
    });
    expect(queue.enqueue(content(4)).discarded).toEqual([
      { id: 2, receivedAt: 0, reason: "evicted" },
    ]);
    expect(queue.bytes).toBe(10);
    expect(queue.take().message).toBeUndefined();
  });

  it("prioritizes new arrivals over due retries", () => {
    const queue = new EmailQueue(() => now);
    const old = queue.enqueue(content()).id;
    queue.take();
    queue.settle(old, "temporary");
    now = 60_000;
    const fresh = queue.enqueue(content()).id;
    expect(queue.take().message.id).toBe(fresh);
    queue.settle(fresh, "complete");
    expect(queue.take().message.id).toBe(old);
  });

  it("uses 1, 5, 10 and then repeated 30 minute retry delays", () => {
    expect([1, 2, 3, 4, 5].map(retryDelay)).toEqual([
      60_000, 300_000, 600_000, 1_800_000, 1_800_000,
    ]);
    const queue = new EmailQueue(() => now);
    const id = queue.enqueue(content()).id;
    for (const delay of [60_000, 300_000, 600_000, 1_800_000]) {
      expect(queue.take().message.id).toBe(id);
      queue.settle(id, "temporary");
      now += delay - 1;
      expect(queue.take().message).toBeUndefined();
      now++;
    }
  });

  it("does not let new arrivals bypass a connection cooldown", () => {
    const queue = new EmailQueue(() => now);
    const id = queue.enqueue(content()).id;
    queue.take();
    queue.settle(id, "connection");
    const fresh = queue.enqueue(content()).id;
    expect(queue.take().message).toBeUndefined();
    now = 60_000;
    expect(queue.take().message.id).toBe(fresh);
  });

  it("pauses the connection for configuration/security failures until resumed", () => {
    const queue = new EmailQueue(() => now);
    const id = queue.enqueue(content()).id;
    queue.take();
    queue.settle(id, "configuration");
    queue.enqueue(content());
    now = 60_000;
    expect(queue.take().message).toBeUndefined();
    queue.resume();
    expect(queue.take().message).toBeDefined();
  });

  it("expires from original receipt even after retries and configuration changes", () => {
    const queue = new EmailQueue(() => now);
    const id = queue.enqueue(content()).id;
    queue.take();
    now = EMAIL_QUEUE_LIMITS.ttl - 1;
    queue.settle(id, "temporary");
    queue.resume();
    now++;
    expect(queue.take()).toEqual({
      discarded: [{ id, receivedAt: 0, reason: "expired" }],
    });
    expect(queue.bytes).toBe(0);
  });

  it("finishes a send crossing TTL but cannot retry expired content", () => {
    const queue = new EmailQueue(() => now);
    const id = queue.enqueue(content()).id;
    queue.take();
    now = EMAIL_QUEUE_LIMITS.ttl;
    expect(queue.expire()).toEqual([]);
    expect(queue.settle(id, "temporary")).toEqual([
      { id, receivedAt: 0, reason: "expired" },
    ]);
    expect(queue.size).toBe(0);
  });

  it.each(["complete", "permanent"] as const)(
    "releases content on %s and never retries it",
    (result) => {
      const queue = new EmailQueue(() => now);
      const id = queue.enqueue(content()).id;
      queue.take();
      queue.settle(id, result);
      queue.resume();
      expect(queue.take().message).toBeUndefined();
      expect(queue.bytes).toBe(0);
      expect(() => queue.settle(id, result)).toThrow(
        "No matching active email"
      );
    }
  );

  it("owns its raw message bytes so callers cannot mutate pending content", () => {
    const queue = new EmailQueue(() => now);
    const raw = content();
    queue.enqueue(raw);
    raw[0] = 0;
    const message = queue.take().message;
    expect(message.content.toString()).toBe("x");
    message.content[0] = 0;
    queue.settle(message.id, "temporary");
    queue.resume();
    expect(queue.take().message.content.toString()).toBe("x");
  });

  it("rejects invalid capacity policies", () => {
    expect(
      () => new EmailQueue(() => now, { count: 0, bytes: 1, ttl: 1 })
    ).toThrow();
  });
});
