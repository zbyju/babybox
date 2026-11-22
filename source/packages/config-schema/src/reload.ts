import { z } from "zod";

export const unappliedFieldSchema = z.discriminatedUnion("path", [
  z.object({
    path: z.literal("backend.port"),
    running: z.union([z.string(), z.number().finite()]),
    stored: z.number().finite(),
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
