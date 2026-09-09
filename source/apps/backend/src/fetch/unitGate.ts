import { Unit } from "../types/units.types";

type Job<T> = () => Promise<T>;

/**
 * The reads that callers are allowed to share.
 *
 * A closed set, so a typo or a new interpolated string cannot silently open a
 * key of its own. The timeout is part of the key because two callers asking with
 * different timeouts are not asking the same question.
 */
export type SharedRead = `data:${number}` | `settings:${number}`;

/*
 * A queued job with its caller's callbacks already closed over.
 * Keeping them together lets the queue hold jobs of different result types
 * without a cast, and `run` never rejects, so the queue keeps moving.
 */
interface Waiter {
  run: () => Promise<void>;
}

/**
 * Runs one job at a time against a single hardware unit.
 *
 * The units are small embedded HTTP servers. Concurrent connections make them
 * slower, which widens the overlap and makes the pile-up feed itself, so every
 * request to a unit goes through here.
 *
 * WARN: a job must never call `onUnit` or `sharedOnUnit` for its own unit.
 * The queue runs one job at a time, so the inner call waits for the outer job,
 * which is waiting for the inner call. That freezes the unit for every later
 * caller, with no timeout and no error. Build the whole sequence inside one job
 * instead, the way `updateSettings` does.
 */
export class UnitQueue {
  private busy = false;
  private waiting: Waiter[] = [];
  private shared = new Map<SharedRead, Promise<unknown>>();

  /**
   * Queues a job behind everything already waiting for this unit.
   *
   * Set `first` for operator actions such as opening the doors, so they do not
   * wait behind polling. They still never run next to another request.
   */
  run<T>(job: Job<T>, first = false): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const waiter: Waiter = { run: () => job().then(resolve, reject) };

      if (first) this.waiting.unshift(waiter);
      else this.waiting.push(waiter);

      this.drain();
    });
  }

  /**
   * Same as `run`, but callers arriving while an identical job is still running
   * share its result instead of asking the unit twice. Only for reads.
   */
  runShared<T>(key: SharedRead, job: Job<T>): Promise<T> {
    const existing = this.shared.get(key);
    if (existing !== undefined) return existing as Promise<T>;

    const pending = this.run(job).then(
      (value) => {
        this.shared.delete(key);
        return value;
      },
      (err) => {
        this.shared.delete(key);
        throw err;
      }
    );

    this.shared.set(key, pending);
    return pending;
  }

  private async drain(): Promise<void> {
    if (this.busy) return;
    this.busy = true;

    let next = this.waiting.shift();
    while (next !== undefined) {
      await next.run();
      next = this.waiting.shift();
    }

    this.busy = false;
  }
}

const queues: Record<Unit, UnitQueue> = {
  [Unit.Engine]: new UnitQueue(),
  [Unit.Thermal]: new UnitQueue(),
};

export function onUnit<T>(unit: Unit, job: Job<T>, first = false): Promise<T> {
  return queues[unit].run(job, first);
}

export function sharedOnUnit<T>(
  unit: Unit,
  key: SharedRead,
  job: Job<T>
): Promise<T> {
  return queues[unit].runShared(key, job);
}
