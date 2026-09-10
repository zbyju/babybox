// TODO: Remove this file - move to connection store

export enum ConnectionResult {
  Success = 1,
  Fail = 0,
}

export class ConnectionTracker {
  RECENT_SIZE: number;
  recentQueue: Array<ConnectionResult>;
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
   * Measured against result timestamps, not the clock, so time in which the
   * panel sent nothing at all (the loop is stopped) does not count as downtime.
   */
  failStreakMs: number;
  private failStreakStartedAt: number;

  constructor() {
    this.RECENT_SIZE = 999;
    this.recentQueue = [];
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
    const now = Date.now();
    this.requests++;

    // Add to recent requests
    if (this.recentQueue.length >= this.RECENT_SIZE) {
      this.recentQueue.shift();
    }
    this.recentQueue.push(res);

    // Add to stats
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

  getLatestResults(n: number): Array<ConnectionResult> {
    if (n > this.recentQueue.length) n = this.recentQueue.length;
    return this.recentQueue.slice(-n);
  }

  getAllLatestResults(): Array<ConnectionResult> {
    return this.recentQueue;
  }

  countRecentSuccess(): number {
    return this.recentQueue.filter((x) => {
      return x === ConnectionResult.Success;
    }).length;
  }

  countRecentFails(): number {
    return this.recentQueue.filter((x) => {
      return x === ConnectionResult.Fail;
    }).length;
  }

  getRecentQuality(): number {
    return this.calculateQuality(
      this.recentQueue.length,
      this.countRecentSuccess(),
    );
  }

  getQuality(): number {
    return this.calculateQuality(this.requests, this.successes);
  }

  getStats() {
    return {
      requests: this.requests,
      successes: this.successes,
      fails: this.fails,
      quality: this.getQuality(),

      recentRequests: this.recentQueue.length,
      recentSuccesses: this.countRecentSuccess(),
      recentFails: this.countRecentFails(),
      recentQuality: this.getRecentQuality(),

      failStreak: this.failStreak,
      failStreakMs: this.failStreakMs,
    };
  }
}
