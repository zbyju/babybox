import { EngineUnit, ThermalUnit } from "@/types/units-data";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

export const getData = (
  timeout: number,
  ip: string,
  postfix: string,
  appendTime = true
): Promise<EngineUnit | ThermalUnit> => {
  const time = appendTime ? "&" + new Date().getTime() : "";
  const url = `http://${ip}${postfix}${time}`;
  console.log(url);
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
