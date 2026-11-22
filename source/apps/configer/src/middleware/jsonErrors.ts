import { httpErrorMetadataSchema } from "@babybox/config-schema";
import type { ErrorRequestHandler } from "express";
import { STATUS_CODES } from "node:http";

/*
 * Express 5 sends a rejected promise from an async handler here.
 * Express 4 let it reject into nowhere, so a throw in one of the async
 * routes had no answer at all.
 * Without this the built-in handler answers with an HTML page,
 * and the panel reads every answer as JSON.
 */
// err: express types it any, and the contract bans any.
export const jsonErrors: ErrorRequestHandler = (
  err: unknown,
  _req,
  res,
  next
) => {
  if (res.headersSent) {
    next(err);
    return;
  }
  // The whole error, so the box log keeps the stack express used to print.
  console.error(err);
  const metadata = httpErrorMetadataSchema.safeParse(err);
  const status = metadata.success ? (metadata.data.status ?? 500) : 500;
  const message =
    metadata.success && metadata.data.expose && err instanceof Error
      ? err.message
      : (STATUS_CODES[status] ?? "Error");
  res.status(status).json({ error: message });
};
