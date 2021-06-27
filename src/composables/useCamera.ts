import { ref, onMounted } from "vue";
import { CameraConfig } from "@/types/main";

export default function useCamera(config: CameraConfig) {
  const time = ref(new Date().getTime().toString());
  const url = ref("");
  onMounted(() => {
    setInterval(() => {
      time.value = new Date().getTime().toString();
      url.value = `http://${config.username}:${config.password}@${config.ip}/cgi-bin/snapshot.cgi?Channel=0/${time.value}`;
    }, config.updateDelay);
  });
  return url;
}
