import { computed, watch, ref, ComputedRef } from "vue";
import { Message } from "@/types/main";

export default function useCamera(message: ComputedRef<Message>) {
  const messageDelayed = ref(message.value);
  const heightStyle = computed(() => {
    return message.value ? "visible" : "hidden";
  });
  watch(message, () => {
    if (message.value) {
      messageDelayed.value = message.value;
    } else {
      setTimeout(() => {
        messageDelayed.value = message.value;
      }, 1000);
    }
  });
  return { messageDelayed, heightStyle };
}
