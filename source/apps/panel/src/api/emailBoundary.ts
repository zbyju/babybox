import { z } from "zod";

const emailRecord = z.object({
  id: z.string(),
  receivedAt: z.number(),
  subject: z.string(),
  source: z.string(),
  sourceIp: z.string().optional(),
  sender: z.string(),
  bytes: z.number(),
  status: z.string(),
  contentAvailable: z.boolean(),
  requestedRecipients: z.array(z.string()),
  recipients: z.record(z.string(), z.string()),
  text: z.string(),
  headers: z.string(),
  attachments: z.array(
    z.object({
      filename: z.string(),
      contentType: z.string(),
      size: z.number(),
    }),
  ),
  events: z.array(
    z.object({ at: z.number(), kind: z.string(), detail: z.string() }),
  ),
});

export const emailStatusSchema = z.object({
  listener: z.string(),
  error: z.string().nullable(),
  historyError: z.string().nullable(),
  configured: z.boolean(),
  runtimeSupported: z.boolean(),
  bytes: z.number(),
  queue: z.array(
    z.object({
      id: z.string(),
      subject: z.string(),
      receivedAt: z.number(),
      attempts: z.number(),
      active: z.boolean(),
      stopped: z.boolean(),
      paused: z.boolean(),
    }),
  ),
  history: z.array(emailRecord),
});

export const emailActionResultSchema = z.object({
  msg: z.string(),
  id: z.string().optional(),
});

export type EmailStatus = z.infer<typeof emailStatusSchema>;
