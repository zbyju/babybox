import { UnitQueue, UnitReadResult } from "../unitGate";

function deferred<T>() {
  let resolve: (value: T) => void;
  let reject: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("unitGate.ts", () => {
  // A fresh queue per test, so a job left hanging cannot reach the next one.
  let queue: UnitQueue;

  beforeEach(() => {
    queue = new UnitQueue();
  });

  describe("run", () => {
    it("should not start a job while another one is running on the same unit", async () => {
      const first = deferred<string>();
      let secondStarted = false;

      const a = queue.run(() => first.promise);
      const b = queue.run(async () => {
        secondStarted = true;
        return "b";
      });

      await Promise.resolve();
      expect(secondStarted).toBe(false);

      first.resolve("a");
      expect(await a).toBe("a");
      expect(await b).toBe("b");
      expect(secondStarted).toBe(true);
    });

    it("should keep the queue moving when a job fails", async () => {
      const failing = queue.run(() => Promise.reject("boom"));
      const following = queue.run(() => Promise.resolve("ok"));

      await expect(failing).rejects.toBe("boom");
      expect(await following).toBe("ok");
    });

    it("should run two queues independently", async () => {
      const other = new UnitQueue();
      const blocking = deferred<string>();
      let otherDone = false;

      const blocked = queue.run(() => blocking.promise);
      const free = other.run(async () => {
        otherDone = true;
        return "t";
      });

      expect(await free).toBe("t");
      expect(otherDone).toBe(true);

      blocking.resolve("e");
      expect(await blocked).toBe("e");
    });

    it("should run a priority job before jobs already waiting", async () => {
      const blocking = deferred<string>();
      const order: string[] = [];

      const running = queue.run(() => blocking.promise);
      const queued = queue.run(async () => {
        order.push("queued");
        return "queued";
      });
      const urgent = queue.run(async () => {
        order.push("urgent");
        return "urgent";
      }, true);

      blocking.resolve("running");
      await Promise.all([running, queued, urgent]);

      expect(order).toEqual(["urgent", "queued"]);
    });

    it("should keep running jobs after one throws before it returns a promise", async () => {
      const thrower = queue.run(() => {
        throw new Error("sync");
      });

      await expect(thrower).rejects.toThrow("sync");
      expect(await queue.run(async () => "next")).toBe("next");
    });
  });

  describe("runShared", () => {
    // Shared reads resolve to a unit response, so the jobs return that shape.
    const reading = (data: unknown): UnitReadResult => ({ status: 200, data });

    it("should give callers of the same key one shared run", async () => {
      const pending = deferred<UnitReadResult>();
      let runs = 0;

      const job = () => {
        runs += 1;
        return pending.promise;
      };

      const a = queue.runShared("data:5000", job);
      const b = queue.runShared("data:5000", job);

      pending.resolve(reading("shared"));

      expect((await a).data).toBe("shared");
      expect((await b).data).toBe("shared");
      expect(runs).toBe(1);
    });

    it("should run again after the shared run finished", async () => {
      let runs = 0;
      const job = async () => {
        runs += 1;
        return reading(runs);
      };

      expect((await queue.runShared("data:5000", job)).data).toBe(1);
      expect((await queue.runShared("data:5000", job)).data).toBe(2);
    });

    it("should not share between different keys", async () => {
      let runs = 0;
      const job = async () => {
        runs += 1;
        return reading(runs);
      };

      await Promise.all([
        queue.runShared("data:1000", job),
        queue.runShared("data:5000", job),
      ]);

      expect(runs).toBe(2);
    });

    it("should let the next caller run again after a failure", async () => {
      await expect(
        queue.runShared("settings:5000", () => Promise.reject("boom"))
      ).rejects.toBe("boom");

      expect(
        (
          await queue.runShared("settings:5000", () =>
            Promise.resolve(reading("ok"))
          )
        ).data
      ).toBe("ok");
    });
  });

  describe("deadline", () => {
    // Short enough to wait out for real, so the test needs no fake timers.
    const DEADLINE = 20;
    let bounded: UnitQueue;

    beforeEach(() => {
      bounded = new UnitQueue(DEADLINE);
    });

    it("should reject a job that never settles", async () => {
      const stuck = bounded.run(() => new Promise<string>(() => undefined));

      await expect(stuck).rejects.toThrow("did not settle");
    });

    it("should keep the queue moving after a job passes the deadline", async () => {
      const stuck = bounded.run(() => new Promise<string>(() => undefined));
      const next = bounded.run(async () => "next");

      await expect(stuck).rejects.toThrow("did not settle");
      expect(await next).toBe("next");
    });

    it("should not reject a job that settles in time", async () => {
      const job = deferred<string>();
      const result = bounded.run(() => job.promise);

      job.resolve("ok");

      expect(await result).toBe("ok");
    });
  });
});
