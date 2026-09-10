import { backendApi } from "@/api/base";
import { request } from "@/api/http";

export const refreshRestartCooldown = async (): Promise<void> => {
  const { baseUrl, timeout, isConfigured } = backendApi();
  if (!isConfigured) return;

  await request(`${baseUrl}/restart/refresh`, { timeout });
};
