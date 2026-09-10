import { backendApi } from "@/api/base";
import { request } from "@/api/http";
import { singleFlight } from "@/utils/singleFlight";

export const refreshRestartCooldown = singleFlight(async (): Promise<void> => {
  const { baseUrl, timeout, isConfigured } = backendApi();
  if (!isConfigured) return;

  await request(`${baseUrl}/restart/refresh`, { timeout });
});
