import type { Ref } from "vue";
import { ref } from "vue";

import { type CameraConfig } from "@/types/panel/config.types";
import { getURLPostfix, stringToCameraType } from "@/utils/panel/camera";

/**
 * This composable is for getting the url to the camera.
 *
 * Depending on the implementation this value might change (to refresh the img).
 *
 * @param config - camera config
 * @returns url to the image
 */
export default function useCamera(
  config: CameraConfig,
  onUpdate?: () => any,
): Ref<string> {
  const url = ref("");
  // if (config.cameraType === "dahua") {
  //   url.value = `http://${config.username}:${config.password}@${config.ip}/cgi-bin/mjpg/video.cgi?channel=0&subtype=1`;
  // } else {
  // Update camera URL (timestamp) every @config.updateDelay miliseconds - resulting in updating the image
  setInterval(() => {
    const cameraType = stringToCameraType(config.cameraType);
    const time = new Date().getTime().toString();
    url.value = `http://${config.username}:${config.password}@${
      config.ip
    }${getURLPostfix(cameraType)}${time}`;

    if (onUpdate) {
      onUpdate();
    }
  }, config.updateDelay);
  // }

  return url;
}
