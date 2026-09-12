import type { MainConfigCameraType } from "@babybox/config-schema";

const AVTECH_SNAPSHOT = "/cgi-bin/guest/Video.cgi?media=JPEG&channel=0/";

/* avm cameras answer the avtech snapshot url. */
const urlPostfixes: Record<MainConfigCameraType, string> = {
  dahua: "/cgi-bin/snapshot.cgi?Channel=0/",
  hikvision: "/ISAPI/Streaming/channels/101/picture?snapShotImageType=JPEG",
  avtech: AVTECH_SNAPSHOT,
  avm: AVTECH_SNAPSHOT,
  vivotek: "/cgi-bin/viewer/video.jpg/",
};

/*
 * The panel's config check only asks for a string, so the name can be one we do not
 * know. Falling back to dahua is what the old stringToCameraType did, and a wrong
 * snapshot url costs one camera; refusing the config costs the whole panel.
 */
export const getURLPostfix = (type: string): string => {
  const postfix = (urlPostfixes as Record<string, string>)[type];
  if (postfix !== undefined) return postfix;

  console.warn(`Unknown camera type "${type}", using the dahua url`);
  return urlPostfixes.dahua;
};
