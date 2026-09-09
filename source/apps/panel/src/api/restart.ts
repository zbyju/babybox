import axios from "axios";

import { backendApi } from "@/api/base";

export const refreshRestartCooldown = () => {
  const { baseUrl, timeout, isConfigured } = backendApi();
  if (!isConfigured) return;

  return axios.get(`${baseUrl}/restart/refresh`, { timeout });
};
