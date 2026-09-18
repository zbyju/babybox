import throttle from "lodash/throttle";
import type { Ref } from "vue";
import { ref, watch } from "vue";

import type { Maybe } from "@/types/generic.types";

/**
 * This composable is for the blinking colon functionality
 *
 * The colon is supposed to blink, but only when the babybox is not active;
 * if it is then the colon is visible at all times
 *
 * The colon should be blinking when the time changes (but it is throttled to not blinking too fast)
 *
 * @param time - current time
 * @param active - is babybox active
 * @param blinkDelay - how quickly the colon blinks
 * @returns boolean - should the colon be displayed
 */
export default function useBigClockColon(
  time: Ref<Maybe<number>>,
  active: Ref<boolean>,
  blinkDelay = 1000,
) {
  const showColon = ref(true);

  const blink = () => {
    showColon.value = !showColon.value;
    setTimeout(() => {
      showColon.value = !showColon.value;
    }, blinkDelay);
  };

  const throttledBlink = throttle(blink, blinkDelay * 2);

  watch(time, (newTime, oldTime) => {
    if (active.value) {
      showColon.value = true;
      return;
    }
    const nextSecond =
      newTime === undefined ? undefined : Math.floor(newTime / 1000);
    const prevSecond =
      oldTime === undefined ? undefined : Math.floor(oldTime / 1000);
    if (nextSecond !== prevSecond) {
      throttledBlink();
    }
  });

  return {
    showColon,
  };
}
