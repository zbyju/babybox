import { describe, expect, it } from "vitest";

import { singleFlight } from "../singleFlight";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("singleFlight", () => {
  it("should run once while a call is still pending", async () => {
    const pending = deferred<string>();
    let calls = 0;

    const wrapped = singleFlight(() => {
      calls += 1;
      return pending.promise;
    });

    const a = wrapped();
    const b = wrapped();
    pending.resolve("done");

    expect(await a).toBe("done");
    expect(await b).toBe("done");
    expect(calls).toBe(1);
  });

  it("should run again once the previous call finished", async () => {
    let calls = 0;
    const wrapped = singleFlight(async () => {
      calls += 1;
      return calls;
    });

    expect(await wrapped()).toBe(1);
    expect(await wrapped()).toBe(2);
  });

  it("should run again after a rejection", async () => {
    let calls = 0;
    const wrapped = singleFlight(() => {
      calls += 1;
      return calls === 1 ? Promise.reject("boom") : Promise.resolve("ok");
    });

    await expect(wrapped()).rejects.toBe("boom");
    expect(await wrapped()).toBe("ok");
  });

  it("should give every waiting caller the same rejection", async () => {
    const pending = deferred<string>();
    const wrapped = singleFlight(() => pending.promise);

    const a = wrapped();
    const b = wrapped();
    pending.reject("boom");

    await expect(a).rejects.toBe("boom");
    await expect(b).rejects.toBe("boom");
  });
});
