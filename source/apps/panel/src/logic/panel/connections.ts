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

  constructor() {
    this.requests = 0;
    this.successes = 0;
    this.fails = 0;
    this.failStreak = 0;
  }

  calculateQuality(n: number, x: number) {
    if (n === 0) return 100;
    return (x / n) * 100;
  }

  addResult(res: ConnectionResult) {
    this.requests++;

    if (res === ConnectionResult.Success) {
      this.successes++;
      this.failStreak = 0;
    }
    if (res === ConnectionResult.Fail) {
      this.fails++;
      this.failStreak++;
    }
  }

  getQuality(): number {
    return this.calculateQuality(this.requests, this.successes);
  }
}
