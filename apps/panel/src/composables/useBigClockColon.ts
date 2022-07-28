import _ from "lodash";
import type { Moment } from "moment";
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
  time: Ref<Maybe<Moment>>,
  active: Ref<boolean>,
  blinkDelay = 1000,
) {
  const showColon = ref(true);

  // Colon blinks for @BLINK_DELAY miliseconds
  const blink = () => {
    showColon.value = !showColon.value;
    setTimeout(() => {
      showColon.value = !showColon.value;
    }, blinkDelay);
  };

  // Blink at max once every @BLINK_DELAY * 2 miliseconds
  const throttledBlink = _.throttle(blink, blinkDelay * 2);

  // Blink when time changes
  watch(time, (newTime, oldTime) => {
    if (active.value) {
      showColon.value = true;
      return;
    }
    if (newTime?.unix().toString() !== oldTime?.unix().toString()) {
      throttledBlink();
    }
  });

  return {
    showColon,
  };
}
