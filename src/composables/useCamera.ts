import { CameraConfig } from "@/types/panel/main";
import { getURLPostfix, stringToCameraType } from "@/utils/panel/camera";
import { ref, Ref } from "vue";

export default function useCamera(config: CameraConfig): Ref<string> {
  const url = ref("");
  // if (config.cameraType === "dahua") {
  //   url.value = `http://${config.username}:${config.password}@${config.ip}/cgi-bin/mjpg/video.cgi?channel=0&subtype=1`;
  // } else {
  // Update camera URL (timestamp) every @config.updateDelay miliseconds - resulting in updating the image
  setInterval(() => {
    const time = new Date().getTime().toString();
    url.value = `http://${config.username}:${config.password}@${
      config.ip
    }${getURLPostfix(stringToCameraType(config.cameraType))}${time}`;
  }, config.updateDelay);
  // }

  return url;
}
