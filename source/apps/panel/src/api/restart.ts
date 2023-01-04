import axios from "axios";
import { storeToRefs } from "pinia";

import { useConfigStore } from "@/pinia/configStore";

export const refreshRestartCooldown = () => {
  const configStore = useConfigStore();
  const { backend: api } = storeToRefs(configStore);
  if (api.value.port === undefined || api.value.url === undefined) return;
  const url = `http://localhost:${api.value.port}${api.value.url}/restart/refresh`;
  const timeout = api.value.requestTimeout || 5000;

  return axios.get(url, { timeout: timeout });
};
