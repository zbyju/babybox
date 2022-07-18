import type { Message } from "@/types/panel/main.types";
import { computed, ref, watch } from "vue";
import type { Ref } from "vue";
import type { Maybe } from "@/types/generic.types";

/**
 * This composable is for the animation of the message and when it should get displayed.
 *
 * The message gets displayed immeadiately when there is one; but when it is getting deleted
 * it should not get deleted until some delay so that the animation can complete.
 *
 * @param message - message to be displayed
 * @returns object - messageDelayed - the actual message; heightStyle - should the message be hidden
 */
export default function useDelayedMessage(message: Ref<Maybe<Message>>) {
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
