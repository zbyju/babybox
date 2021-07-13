import { EngineUnit, ThermalUnit } from "@/types/units-data";
import { resolveComponent } from "vue";

const thermalURL = "http://192.168.100.85";
const engineURL = "http://192.168.100.86";
const postfix = "/get_ram[0]?rn=60";

const getData = (
  unit: "thermal" | "engine"
): Promise<EngineUnit | ThermalUnit> => {
  const url =
    unit === "thermal"
      ? thermalURL + postfix + "&" + new Date().getTime()
      : engineURL + postfix + "&" + new Date().getTime();

  return new Promise((resolve, reject) => {
    fetch(url)
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

export const getEngineData = async (): Promise<EngineUnit> => {
  return getData("engine");
};

export const getThermalData = async (): Promise<EngineUnit> => {
  return getData("thermal");
};
