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

/**
 * What a shared read resolves to: the `{ status, data }` of `fetchFromUrl`.
 *
 * Shared reads are keyed by a string, so a generic result type would let two
 * callers on one key ask for different types and get each other's value with
 * no compile error. One concrete type removes that.
 */
export interface UnitReadResult {
  status: number;
  data: unknown;
}

/**
 * Ceiling on one queued job.
 *
 * The queue has no other way out. A job whose promise never settles keeps
 * `drain` inside its `await`, and then every later caller for that unit waits
 * with no error and no log. The engine queue carries the watchdog refresh, and
 * the babybox blocks itself once that timer lapses, so a stuck lock takes the
 * babybox out of service on a machine with nobody watching.
 *
 * Well above any legitimate job. The longest one is a settings attempt, which
 * is four requests at the fetch timeout, so this only ever fires on a job that
 * is stuck rather than slow.
 */
const JOB_DEADLINE = 60000;

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
 * which is waiting for the inner call. `JOB_DEADLINE` breaks the deadlock, but
 * only after a minute in which the unit answered nothing. Build the whole
 * sequence inside one job instead, the way `updateSettings` does.
 */
export class UnitQueue {
  private busy = false;
  private waiting: Waiter[] = [];
  private shared = new Map<SharedRead, Promise<UnitReadResult>>();

  constructor(private deadlineMs = JOB_DEADLINE) {}

  /**
   * Queues a job behind everything already waiting for this unit.
   *
   * Set `first` for operator actions such as opening the doors, so they do not
   * wait behind polling. They still never run next to another request.
   */
  run<T>(job: Job<T>, first = false): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      /*
       * `Promise.resolve().then(job)` so a job that throws before it returns a
       * promise rejects the caller instead of escaping past `.then`.
       */
      const waiter: Waiter = {
        run: () =>
          withDeadline(Promise.resolve().then(job), this.deadlineMs).then(
            resolve,
            reject
          ),
      };

      if (first) this.waiting.unshift(waiter);
      else this.waiting.push(waiter);

      this.drain();
    });
  }

  /**
   * Same as `run`, but callers arriving while an identical job is still running
   * share its result instead of asking the unit twice. Only for reads.
   */
  runShared(
    key: SharedRead,
    job: Job<UnitReadResult>
  ): Promise<UnitReadResult> {
    const existing = this.shared.get(key);
    if (existing !== undefined) return existing;

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

    try {
      let next = this.waiting.shift();
      while (next !== undefined) {
        await next.run();
        next = this.waiting.shift();
      }
    } finally {
      /*
       * Without the finally, one unexpected rejection here leaves the queue
       * busy for good and every later caller for this unit hangs with no error.
       */
      this.busy = false;
    }
  }
}

/*
 * Rejects once the deadline passes. The job's own promise is left alone,
 * because there is no way to cancel it; the queue just stops waiting for it.
 */
function withDeadline<T>(job: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Unit job did not settle within ${ms}ms.`)),
      ms
    );
  });

  return Promise.race([job, deadline]).finally(() => clearTimeout(timer));
}

const queues: Record<Unit, UnitQueue> = {
  [Unit.Engine]: new UnitQueue(),
  [Unit.Thermal]: new UnitQueue(),
};

export function onUnit<T>(unit: Unit, job: Job<T>, first = false): Promise<T> {
  return queues[unit].run(job, first);
}

export function sharedOnUnit(
  unit: Unit,
  key: SharedRead,
  job: Job<UnitReadResult>
): Promise<UnitReadResult> {
  return queues[unit].runShared(key, job);
}
