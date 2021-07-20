import { EngineUnit, ThermalUnit } from "@/types/units-data";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

const engineURL = "http://192.168.100.81";
const thermalURL = "http://192.168.100.86";
const postfix = "/get_ram[0]?rn=60";

const getData = (
  unit: "thermal" | "engine",
  timeout: number
): Promise<EngineUnit | ThermalUnit> => {
  const url =
    unit === "thermal"
      ? thermalURL + postfix + "&" + new Date().getTime()
      : engineURL + postfix + "&" + new Date().getTime();

  return new Promise((resolve, reject) => {
    fetchWithTimeout(url, { timeout: timeout })
      .then((response) => response.text())
      .then((data) => {
        const unitData = data.split("|").map((x, i) => {
          return { index: i, value: x };
        });
        resolve(unitData);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const getEngineData = async (timeout: number): Promise<EngineUnit> => {
  return getData("engine", timeout);
};

export const getThermalData = async (timeout: number): Promise<ThermalUnit> => {
  return getData("thermal", timeout);
};
