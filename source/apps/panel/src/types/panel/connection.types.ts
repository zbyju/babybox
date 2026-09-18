import type { ConnectionStats } from "@/logic/panel/connections";
import { createConnectionStats } from "@/logic/panel/connections";

export interface Connection {
  engineUnit: ConnectionStats;
  thermalUnit: ConnectionStats;
}

export const getDefaultConnection = (): Connection => {
  return {
    engineUnit: createConnectionStats(),
    thermalUnit: createConnectionStats(),
  };
};
