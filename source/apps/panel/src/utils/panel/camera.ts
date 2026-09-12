import type { MainConfigCameraType } from "@babybox/config-schema";

const AVTECH_SNAPSHOT = "/cgi-bin/guest/Video.cgi?media=JPEG&channel=0/";

/* avm is an AVTECH camera sold under the older name, so it answers the same url. */
const urlPostfixes: Record<MainConfigCameraType, string> = {
  dahua: "/cgi-bin/snapshot.cgi?Channel=0/",
  hikvision: "/ISAPI/Streaming/channels/101/picture?snapShotImageType=JPEG",
  avtech: AVTECH_SNAPSHOT,
  avm: AVTECH_SNAPSHOT,
  vivotek: "/cgi-bin/viewer/video.jpg/",
};

export const getURLPostfix = (type: MainConfigCameraType): string =>
  urlPostfixes[type];
