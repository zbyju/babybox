export const prettyTemperature = (temp: string): string => {
  if (!temp || temp === "") return "";
  const parsed = parseInt(temp);
  if (isNaN(parsed)) return "";
  return `${(parsed / 100).toFixed(2)}°C`;
};
