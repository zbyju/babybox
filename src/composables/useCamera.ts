import { ref, Ref } from "vue";
import { CameraConfig } from "@/types/main";
import { getURLPostfix, stringToCameraType } from "@/utils/panel/camera";

export default function useCamera(config: CameraConfig): Ref<string> {
  const url = ref("");

  // Update camera URL (timestamp) every @config.updateDelay miliseconds - resulting in updating the image
  setInterval(() => {
    const time = new Date().getTime().toString();
    url.value = `http://${config.username}:${config.password}@${
      config.ip
    }${getURLPostfix(stringToCameraType(config.cameraType))}${time}`;
  }, config.updateDelay);

  return url;
}
