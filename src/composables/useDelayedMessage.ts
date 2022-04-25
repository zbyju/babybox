import type { Message } from "@/types/panel/main";
import { computed, ref, watch } from "vue";
import type { Ref } from "vue";

export default function useDelayedMessage(message: Ref<Message>) {
  const MESSAGE_DELAY = 1000;

  const messageDelayed = ref(message.value);
  const heightStyle = computed(() => {
    return message.value ? "visible" : "hidden";
  });

  // If message is getting set - update immediately, if it is getitng removed - update after @MESSAGE_DELAY miliseconds
  watch(message, () => {
    if (message.value) {
      messageDelayed.value = message.value;
    } else {
      setTimeout(() => {
        messageDelayed.value = message.value;
      }, MESSAGE_DELAY);
    }
  });

  return { messageDelayed, heightStyle };
}
