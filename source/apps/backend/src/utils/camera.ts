import { MainConfigCamera } from "../types/config.types";

function cameraTypeToRtspPath(cameraType: string): string | undefined {
  const t = cameraType.toLowerCase();
  if (t.includes("dahua")) return "/cam/realmonitor?channel=1&subtype=0";
  if (t.includes("hikvision")) return "/Streaming/Channels/101";
  if (t.includes("avtech") || t.includes("avm")) return "/live/ch0";
  if (t.includes("vivotek")) return "/live.sdp";
  return undefined;
}

export function cameraToRtspUrl(
  camera: MainConfigCamera
): string | undefined {
  const path = cameraTypeToRtspPath(camera.cameraType);
  if (!path) return undefined;
  return `rtsp://${camera.username}:${camera.password}@${camera.ip}${path}`;
}
