import { existsSync } from "node:fs";
import { JSONFile, Low } from "lowdb";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { versionsSchema } from "@babybox/config-schema";

export type VersionDb = ReturnType<typeof versionConfig>;

const defaultFile = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../configs/versions.json"
);

export async function versionConfig(file = defaultFile) {
  if (!existsSync(file)) {
    console.info("No versions.json record");
    return { data: () => null };
  }
  const adapter = new JSONFile<unknown>(file);
  const db = new Low(adapter);

  try {
    await db.read();
  } catch (error) {
    console.warn(
      "Unable to read versions.json",
      error instanceof SyntaxError ? "invalid JSON" : "read failed"
    );
    return { data: () => null };
  }
  const parsed = versionsSchema.safeParse(db.data);
  if (!parsed.success) {
    console.warn("Invalid versions.json record");
    return { data: () => null };
  }

  return {
    data: () => parsed.data,
  };
}
