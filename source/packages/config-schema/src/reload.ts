import { z } from "zod";

const unappliedFieldSchema = z.discriminatedUnion("path", [
  z.object({
    path: z.literal("backend.port"),
    // The running port may come from the PORT environment variable.
    running: z.union([z.number(), z.string()]),
    stored: z.number(),
  }),
  z.object({
    path: z.literal("backend.url"),
    running: z.string(),
    stored: z.string(),
  }),
]);

export const reloadResponseSchema = z.object({
  unapplied: z.array(unappliedFieldSchema),
});

export type UnappliedField = z.infer<typeof unappliedFieldSchema>;
