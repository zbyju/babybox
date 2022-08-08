import axios from "axios";
import { storeToRefs } from "pinia";

import { useConfigStore } from "@/pinia/configStore";

export const refreshRestartCooldown = () => {
  const configStore = useConfigStore();
  const { api } = storeToRefs(configStore);
  const url = api.value.baseApiUrl + "/restart/refresh";
  const timeout = api.value.requestTimeout || 5000;

  return axios.get(url);
};
