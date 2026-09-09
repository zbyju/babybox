import type { Ref } from "vue";
import { onUnmounted, ref } from "vue";

import { type CameraConfig } from "@/types/panel/config.types";
import { getURLPostfix, stringToCameraType } from "@/utils/panel/camera";

/**
 * This composable is for getting the url to the camera.
 *
 * Depending on the implementation this value might change (to refresh the img).
 *
 * Starts a refresh timer that is only stopped on the calling component's unmount.
 *
 * @param config - camera config
 * @returns url to the image
 */
export default function useCamera(
  config: CameraConfig,
  onUpdate?: () => any,
): Ref<string> {
  const url = ref("");
  // Update camera URL (timestamp) every @config.updateDelay miliseconds - resulting in updating the image
  const timer = setInterval(() => {
    const cameraType = stringToCameraType(config.cameraType);
    const time = new Date().getTime().toString();
    url.value = `http://${config.username}:${config.password}@${
      config.ip
    }${getURLPostfix(cameraType)}${time}`;

    if (onUpdate) {
      onUpdate();
    }
  }, config.updateDelay);

  onUnmounted(() => clearInterval(timer));

  return url;
}
