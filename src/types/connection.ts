export interface UnitConnection {
  requests: number;
  successful: number;
  failed: number;
}

export interface Connection {
  engineUnit: UnitConnection;
  thermalUnit: UnitConnection;
}

export const DefaultUnitConnection: UnitConnection = {
  requests: 0,
  successful: 0,
  failed: 0,
};

export const DefaultConnection: Connection = {
  engineUnit: Object.assign({}, DefaultUnitConnection),
  thermalUnit: Object.assign({}, DefaultUnitConnection),
};
