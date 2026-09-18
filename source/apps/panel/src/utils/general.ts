export const isNullish = (val: unknown): val is null | undefined => {
  return val === null || val === undefined;
};

export const whenNotNullish = <T>(
  val: unknown,
  to: T,
): T | null | undefined => {
  return isNullish(val) ? val : to;
};
