/*
 * Type only. The backend's dist is installed on its own, outside the workspace, so it
 * can never depend on @babybox/config-schema at runtime. The tsconfig paths entry
 * points at the package's built .d.ts and this export leaves nothing in the JS.
 */
export type { MainConfig } from "@babybox/config-schema";
