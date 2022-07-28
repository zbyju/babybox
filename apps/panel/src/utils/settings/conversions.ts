import type { SettingsTableRowValueType } from "@/types/settings/table.types";

export const typeToMeasureUnit = (type: SettingsTableRowValueType) => {
  if (type === "string") return "";
  if (type === "temperature") return "°C";
  if (type === "voltage") return "V";
  if (type === "seconds") return "s";
  if (type === "days") return "den";
};
