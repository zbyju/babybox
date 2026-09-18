export enum ConnectionResult {
  Success = 1,
  Fail = 0,
}

export type ConnectionStats = {
  requests: number;
  successes: number;
  fails: number;
  failStreak: number;
  failStreakMs: number;
  failStreakStartedAt: number;
};

export function createConnectionStats(): ConnectionStats {
  return {
    requests: 0,
    successes: 0,
    fails: 0,
    failStreak: 0,
    failStreakMs: 0,
    failStreakStartedAt: 0,
  };
}

export function applyConnectionResult(
  stats: ConnectionStats,
  res: ConnectionResult,
  now = performance.now(),
): void {
  stats.requests++;

  if (res === ConnectionResult.Success) {
    stats.successes++;
    stats.failStreak = 0;
    stats.failStreakMs = 0;
    stats.failStreakStartedAt = 0;
  }
  if (res === ConnectionResult.Fail) {
    stats.fails++;
    stats.failStreak++;
    if (stats.failStreak === 1) stats.failStreakStartedAt = now;
    stats.failStreakMs = now - stats.failStreakStartedAt;
  }
}

export function connectionQuality(stats: ConnectionStats): number {
  if (stats.requests === 0) return 100;
  return (stats.successes / stats.requests) * 100;
}

export class ConnectionTracker implements ConnectionStats {
  requests = 0;
  successes = 0;
  fails = 0;
  failStreak = 0;
  failStreakMs = 0;
  failStreakStartedAt = 0;

  addResult(res: ConnectionResult) {
    applyConnectionResult(this, res);
  }

  getQuality(): number {
    return connectionQuality(this);
  }
}
