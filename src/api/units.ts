import { EngineUnit, ThermalUnit } from "@/types/panel/units-data";
import { fetchWithTimeout } from "@/utils/fetchWithTimeout";

export const getData = (
  timeout: number,
  ip: string,
  postfix: string,
  appendTime = true
): Promise<EngineUnit | ThermalUnit> => {
  const time = appendTime ? "&" + new Date().getTime() : "";
  const url = `http://${ip}${postfix}${time}`;
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

export const openDoors = (ip: string, timeout = 10000): Promise<any> => {
  const url = `http://${ip}/sdscep?sys141=201`;
  return new Promise((resolve, reject) => {
    fetchWithTimeout(url, { timeout })
      .then((response) => response.text())
      .then((data) => {
        resolve(data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

export const resetBabybox = (ip: string, timeout = 10000): Promise<any> => {
  const url = `http://${ip}/sdscep?sys141=202`;
  return new Promise((resolve, reject) => {
    fetchWithTimeout(url, { timeout })
      .then((response) => response.text())
      .then((data) => {
        resolve(data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};
