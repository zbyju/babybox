import { ConnectionTracker } from "@/pinia/connectionStore";

export interface Connection {
  engineUnit: ConnectionTracker;
  thermalUnit: ConnectionTracker;
}

export const getDefaultConnection = (): Connection => {
  return {
    engineUnit: new ConnectionTracker(),
    thermalUnit: new ConnectionTracker(),
  };
};
