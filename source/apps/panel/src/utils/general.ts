export const isNullish = (val: any): boolean => {
  return val === null || val === undefined;
};

export const whenNotNullish = (val: any, to: any): any => {
  return isNullish(val) ? val : to;
};
