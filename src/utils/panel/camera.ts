import { CameraType } from "@/types/panel/main.types";

export const stringToCameraType = (s: string): CameraType => {
  if (s.toLowerCase().includes("dahua")) return CameraType.dahua;
  if (s.toLowerCase().includes("dahua-image")) return CameraType.dahua;
  if (s.toLowerCase().includes("avtech") || s.toLowerCase().includes("avm"))
    return CameraType.avtech;
  return CameraType.dahua;
};

export const getURLPostfix = (type: CameraType): string => {
  if (type === CameraType.dahua) return "/cgi-bin/snapshot.cgi?Channel=0/";
  if (type === CameraType.avtech)
    return "/cgi-bin/guest/Video.cgi?media=JPEG&channel=0/";
  return "ERROR";
};
