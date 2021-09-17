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

export const parseBoolean = (s: string): boolean => {
  if (s.toLowerCase() === "true") return true;
  if (s.toLowerCase() === "false" || s == "0") return false;
  try {
    const parsed = parseIntOrEmpty(s);
    if (parsed == 0) return false;
    if (parsed > 0) return true;
  } catch (err) {
    return false;
  }
};

export const prettyBooleanString = (s: string): string => {
  const boolean = parseBoolean(s);
  return prettyBoolean(boolean);
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

const zeroFilled = (num: number, padlen: number): string => {
  const pad_char = "0";
  const pad = new Array(1 + padlen).join(pad_char);
  return (pad + num).slice(-pad.length);
};

export const secondsToTime = (str: string): string => {
  try {
    const parsed: number = parseIntOrEmpty(str);
    if (parsed < 0) return "Neprovedena";
    const d = Math.floor(parsed / (3600 * 24));
    const h = Math.floor((parsed % (3600 * 24)) / 3600);
    const m = Math.floor((parsed % 3600) / 60);
    const s = Math.floor(parsed % 60);
    const dl = d > 1 ? "dnů" : d == 0 ? "den" : "";
    return `${d} ${dl} ${zeroFilled(h, 2)}:${zeroFilled(m, 2)}:${zeroFilled(
      s,
      2
    )}`;
  } catch (err) {
    return "";
  }
};
