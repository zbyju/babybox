export const prettyTemperature = (temp: string): string => {
  if (!temp || temp === "") return "";
  const parsed = parseInt(temp);
  if (isNaN(parsed)) return "";
  return `${(parsed / 100).toFixed(2)}°C`;
};

export const prettyVoltage = (x: string): string => {
  if (!x || x === "") return "";
  const parsed = parseInt(x);
  if (isNaN(parsed)) return "";
  return ((parsed / 1096) * 32).toFixed(1) + "V";
};

export const prettyInt = (num: number): string => {
  return num.toFixed(0);
};

export const prettyNumber = (num: number): string => {
  return num.toFixed(2);
};

export const prettyPercentage = (num: number): string => {
  if (num !== 0 && (!num || isNaN(num))) return "";
  return `${prettyNumber(num)}%`;
};

export const prettyTwoTemperatures = (temp1: string, temp2: string): string => {
  return prettyTwoItems(prettyTemperature(temp1), prettyTemperature(temp2));
};

export const prettyTwoNumbers = (num1: number, num2: number): string => {
  return prettyTwoItems(num1.toString(), num2.toString());
};

export const prettyTwoItems = (s1: string, s2: string): string => {
  return `${s1} | ${s2}`;
};
