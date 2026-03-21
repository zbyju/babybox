export const Result = {
  Error: "ResultError",
  Success: "ResultSuccess",
} as const;

export type ResultType = (typeof Result)[keyof typeof Result];

export const UpdateResult = {
  Error: "UpdateError",
  Updated: "UpdateSuccess",
  Unchanged: "UpdateUnchanged",
} as const;

export type UpdateResultType = (typeof UpdateResult)[keyof typeof UpdateResult];
