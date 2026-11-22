import type { Setting } from "../boundary.js";

export type Unit = Setting["unit"];
export const Unit = { Engine: "engine", Thermal: "thermal" } as const;

export enum Action {
  OpenDoors = "opendoors",
  OpenServiceDoors = "openservicedoors",
}
