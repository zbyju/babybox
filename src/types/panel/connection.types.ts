import { ConnectionTracker } from "@/logic/panel/connections";

export enum ConnectionResult {
  Success = 1,
  Fail = 0,
}

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
