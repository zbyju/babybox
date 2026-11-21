import { z } from "zod";

const startupLastSchema = z.object({
  step: z.string(),
  ok: z.boolean(),
  message: z.string(),
  at: z.string(),
  node: z.string(),
  pnpm: z.string(),
  bun: z.string(),
});

export type StartupLast = z.infer<typeof startupLastSchema>;

export function parseStartupLast(text: string): StartupLast | null {
  try {
    const value: unknown = JSON.parse(text);
    const parsed = startupLastSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
