import type { ErrorRequestHandler } from "express";
import { STATUS_CODES } from "node:http";

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
 * Only a message the thrower marked safe may leave the box. send() builds its
 * errors with expose false exactly so an install path stays internal, and
 * express itself sends the status text and nothing else in production.
 */
function clientMessage(err: unknown, status: number): string {
  const fallback = STATUS_CODES[status] ?? "Error";
  if (typeof err !== "object" || err === null) return fallback;
  if (!("expose" in err) || err.expose !== true) return fallback;
  return err instanceof Error ? err.message : fallback;
}

/*
 * Express 5 sends a rejected promise from an async handler here.
 * Express 4 let it reject into nowhere, so a throw in one of the async
 * routes had no answer at all.
 * Without this the built-in handler answers with an HTML page,
 * and the panel reads every answer as JSON.
 */
// err: express types it any, and the contract bans any.
export const jsonErrors: ErrorRequestHandler = (err: unknown, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  // The whole error, so the box log keeps the stack express used to print.
  console.error(err);
  const status = statusOf(err);
  res.status(status).json({ error: clientMessage(err, status) });
};
