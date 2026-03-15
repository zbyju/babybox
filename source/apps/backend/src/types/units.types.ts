// Keep enums for backward compatibility
// The Zod schemas use z.enum which creates string literal types
export enum Unit {
  Engine = "engine",
  Thermal = "thermal",
}

export enum BothUnit {
  Engine = "engine",
  Thermal = "thermal",
  Both = "both",
}

export enum Action {
  OpenDoors = "opendoors",
  OpenServiceDoors = "openservicedoors",
}
