import type { ErrorRequestHandler } from "express";

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
  res.status(500).json({ error: message });
};
