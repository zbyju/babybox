// TODO: Remove this file - move to connection store

export enum ConnectionResult {
  Success = 1,
  Fail = 0,
}

export class ConnectionTracker {
  requests: number;
  successes: number;
  fails: number;
  failStreak: number;
  /*
   * How long the unit has been failing, measured between the first failure of
   * the current streak and the newest result. Requests run in sequence now, so
   * a tick can take several times the poll delay and a count of failures no
   * longer says how long the unit has been unreachable.
   *
   * Sampled only when a result arrives, so time in which the panel sent
   * nothing at all (the loop is stopped) does not count as downtime.
   *
   * Read from performance.now, which is monotonic. The panel runs unattended
   * for months, and an NTP step on Date.now would make this negative or jump
   * it past the alarm threshold.
   */
  failStreakMs: number;
  private failStreakStartedAt: number;

  constructor() {
    this.requests = 0;
    this.successes = 0;
    this.fails = 0;
    this.failStreak = 0;
    this.failStreakMs = 0;
    this.failStreakStartedAt = 0;
  }

  calculateQuality(n: number, x: number) {
    if (n === 0) return 100;
    return (x / n) * 100;
  }

  addResult(res: ConnectionResult) {
    const now = performance.now();
    this.requests++;

    if (res === ConnectionResult.Success) {
      this.successes++;
      this.failStreak = 0;
      this.failStreakMs = 0;
      this.failStreakStartedAt = 0;
    }
    if (res === ConnectionResult.Fail) {
      this.fails++;
      this.failStreak++;
      if (this.failStreak === 1) this.failStreakStartedAt = now;
      this.failStreakMs = now - this.failStreakStartedAt;
    }
  }

  getQuality(): number {
    return this.calculateQuality(this.requests, this.successes);
  }
}
