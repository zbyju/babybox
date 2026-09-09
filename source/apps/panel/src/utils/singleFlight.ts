/**
 * Wraps an async function so that only one call runs at a time.
 *
 * A call made while a previous one is still running gets that same promise back
 * instead of starting a second request. Use it for anything polled on a timer,
 * where a slow response would otherwise let requests stack up.
 */
export function singleFlight<T>(fn: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;

  return () => {
    if (pending !== undefined) return pending;

    pending = fn().finally(() => {
      pending = undefined;
    });

    return pending;
  };
}
