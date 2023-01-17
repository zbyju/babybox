import { CameraType } from "@/types/panel/config.types";

export const stringToCameraType = (s: string): CameraType => {
  if (s.toLowerCase().includes("dahua")) return CameraType.dahua;
  if (s.toLowerCase().includes("dahua-image")) return CameraType.dahua;
  if (s.toLowerCase().includes("avtech") || s.toLowerCase().includes("avm"))
    return CameraType.avtech;
  if (s.toLowerCase().includes("vivotek")) return CameraType.vivotek;
  return CameraType.dahua;
};

export const getURLPostfix = (type: CameraType): string => {
  if (type === CameraType.dahua) return "/cgi-bin/snapshot.cgi?Channel=0/";
  if (type === CameraType.avtech)
    return "/cgi-bin/guest/Video.cgi?media=JPEG&channel=0/";
  if (type === CameraType.vivotek) return "/cgi-bin/viewer/video.jpg/";
  return "ERROR";
};
