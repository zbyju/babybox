export const parseIntOrEmpty = (x: string): number => {
  if (!x || x === "") throw "Not a number";
  const parsed = parseInt(x);
  if (isNaN(parsed)) throw "Not a number";
  return parsed;
};

export const prettyTemperature = (temp: string): string => {
  try {
    const parsed = parseIntOrEmpty(temp);
    return `${(parsed / 100).toFixed(2)}°C`;
  } catch (err) {
    return "";
  }
};

export const prettyVoltage = (x: string): string => {
  try {
    const parsed = parseIntOrEmpty(x);
    return ((parsed / 1096) * 32).toFixed(1) + "V";
  } catch (err) {
    return "";
  }
};

export const prettyInt = (num: number): string => {
  if (num == null || num == undefined || isNaN(num)) return "";
  return num.toFixed(0);
};

export const prettyNumber = (num: number): string => {
  return num.toFixed(2);
};

export const prettyBooleanString = (s: string): string => {
  if (s.toLowerCase() === "true" || s == "1") return prettyBoolean(true);
  if (s.toLowerCase() === "false" || s == "0") return prettyBoolean(false);
  return "";
};

export const prettyBoolean = (bool: boolean): string => {
  return bool ? "Ano" : "Ne";
};

export const prettyPercentage = (num: number): string => {
  if (num !== 0 && (!num || isNaN(num))) return "";
  return `${prettyNumber(num)}%`;
};

export const prettyTwoTemperatures = (temp1: string, temp2: string): string => {
  return prettyTwoItems(prettyTemperature(temp1), prettyTemperature(temp2));
};

export const prettyTwoPercentages = (num1: number, num2: number): string => {
  return prettyTwoItems(prettyPercentage(num1), prettyPercentage(num2));
};

export const prettyTwoNumbers = (num1: number, num2: number): string => {
  try {
    return prettyTwoItems(num1.toString(), num2.toString());
  } catch (err) {
    return "";
  }
};

export const prettyTwoItems = (s1: string, s2: string): string => {
  if (
    s1 == null ||
    s1 == undefined ||
    s1 == NaN.toString() ||
    s1 == "" ||
    s2 == null ||
    s2 == undefined ||
    s2 == NaN.toString() ||
    s2 == ""
  )
    return "";
  return `${s1} | ${s2}`;
};

export const beamAboveContainer = (s: string): string => {
  try {
    const parsed = parseIntOrEmpty(s);
    if (parsed === 255) return "Překážka";
    else return "Volno";
  } catch (err) {
    return "";
  }
};
