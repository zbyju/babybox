import { onUnit, sharedOnUnit } from "../unitGate";
import { Unit } from "../../types/units.types";

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
  describe("onUnit", () => {
    it("should not start a job while another one is running on the same unit", async () => {
      const first = deferred<string>();
      let secondStarted = false;

      const a = onUnit(Unit.Engine, () => first.promise);
      const b = onUnit(Unit.Engine, async () => {
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
      const failing = onUnit(Unit.Engine, () => Promise.reject("boom"));
      const following = onUnit(Unit.Engine, () => Promise.resolve("ok"));

      await expect(failing).rejects.toBe("boom");
      expect(await following).toBe("ok");
    });

    it("should run the two units independently", async () => {
      const engine = deferred<string>();
      let thermalDone = false;

      const e = onUnit(Unit.Engine, () => engine.promise);
      const t = onUnit(Unit.Thermal, async () => {
        thermalDone = true;
        return "t";
      });

      expect(await t).toBe("t");
      expect(thermalDone).toBe(true);

      engine.resolve("e");
      expect(await e).toBe("e");
    });

    it("should run a priority job before jobs already waiting", async () => {
      const blocking = deferred<string>();
      const order: string[] = [];

      const running = onUnit(Unit.Thermal, () => blocking.promise);
      const queued = onUnit(Unit.Thermal, async () => {
        order.push("queued");
        return "queued";
      });
      const urgent = onUnit(
        Unit.Thermal,
        async () => {
          order.push("urgent");
          return "urgent";
        },
        true
      );

      blocking.resolve("running");
      await Promise.all([running, queued, urgent]);

      expect(order).toEqual(["urgent", "queued"]);
    });
  });

  describe("sharedOnUnit", () => {
    it("should give callers of the same key one shared run", async () => {
      const pending = deferred<string>();
      let runs = 0;

      const job = () => {
        runs += 1;
        return pending.promise;
      };

      const a = sharedOnUnit(Unit.Engine, "data", job);
      const b = sharedOnUnit(Unit.Engine, "data", job);

      pending.resolve("shared");

      expect(await a).toBe("shared");
      expect(await b).toBe("shared");
      expect(runs).toBe(1);
    });

    it("should run again after the shared run finished", async () => {
      let runs = 0;
      const job = async () => {
        runs += 1;
        return runs;
      };

      expect(await sharedOnUnit(Unit.Engine, "data", job)).toBe(1);
      expect(await sharedOnUnit(Unit.Engine, "data", job)).toBe(2);
    });

    it("should not share between different keys", async () => {
      let runs = 0;
      const job = async () => {
        runs += 1;
        return runs;
      };

      await Promise.all([
        sharedOnUnit(Unit.Thermal, "data:1000", job),
        sharedOnUnit(Unit.Thermal, "data:5000", job),
      ]);

      expect(runs).toBe(2);
    });

    it("should let the next caller run again after a failure", async () => {
      await expect(
        sharedOnUnit(Unit.Thermal, "settings", () => Promise.reject("boom"))
      ).rejects.toBe("boom");

      expect(
        await sharedOnUnit(Unit.Thermal, "settings", () =>
          Promise.resolve("ok")
        )
      ).toBe("ok");
    });
  });
});
