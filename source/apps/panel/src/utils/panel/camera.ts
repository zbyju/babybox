import { CameraType } from "@/types/panel/config.types";

export const stringToCameraType = (s: string): CameraType => {
  const lower = s.toLowerCase();
  if (lower.includes("dahua")) return CameraType.dahua;
  if (lower.includes("hikvision")) return CameraType.hikvision;
  if (lower.includes("avtech") || lower.includes("avm"))
    return CameraType.avtech;
  if (lower.includes("vivotek")) return CameraType.vivotek;
  return CameraType.dahua;
};

export const getURLPostfix = (type: CameraType): string => {
  if (type === CameraType.dahua) return "/cgi-bin/snapshot.cgi?Channel=0/";
  if (type === CameraType.hikvision) return "/ISAPI/Streaming/channels/101/picture?snapShotImageType=JPEG";
  if (type === CameraType.avtech)
    return "/cgi-bin/guest/Video.cgi?media=JPEG&channel=0/";
  if (type === CameraType.vivotek) return "/cgi-bin/viewer/video.jpg/";
  return "ERROR";
};
