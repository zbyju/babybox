import { storeToRefs } from "pinia";

import { useConfigStore } from "@/pinia/configStore";

import { getData } from "./units";

export const refreshRestartCooldown = () => {
  const configStore = useConfigStore();
  const { api } = storeToRefs(configStore);
  const url = api.value.baseApiUrl + "/refresh/";
  const timeout = api.value.requestTimeout || 5000;

  return getData(url, timeout);
};
