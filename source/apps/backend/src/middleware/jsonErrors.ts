import type { ErrorRequestHandler } from "express";

/*
 * express.json() rejects a bad body with a 400 on the error itself.
 * Anything else that reaches here is ours, so it is a 500.
 */
function statusOf(err: unknown): number {
  if (typeof err !== "object" || err === null) return 500;
  if (!("status" in err)) return 500;
  const status = err.status;
  if (typeof status !== "number") return 500;
  if (status < 400 || status > 599) return 500;
  return status;
}

/*
 * Express 5 sends a rejected promise from an async handler here.
 * Express 4 let it reject into nowhere, so a throw in one of the async
 * routes had no answer at all.
 * Without this the built-in handler answers with an HTML page,
 * and the panel reads every answer as JSON.
 */
export const jsonErrors: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
  res.status(statusOf(err)).json({ error: message });
};
