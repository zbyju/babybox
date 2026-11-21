// Development uses the workspace schema. The build puts the compiled schema
// at this location so the backend can run from a standalone dist.
export {
  parseStartupLast,
  type StartupLast,
} from "../../../../packages/config-schema/dist/startupRecord.js";
