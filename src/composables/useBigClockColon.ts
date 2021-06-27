import moment from "moment";
import { ref, watch, ComputedRef } from "vue";
import _ from "lodash";

export default function useBigClockColon(time: ComputedRef<moment.Moment>) {
  const BLINK_DELAY = 1000;

  const showColon = ref(true);
  let canBlink = true;

  setInterval(() => {
    if (canBlink) _.debounce(blink, 1000);
    canBlink = false;
  }, BLINK_DELAY + 1000);

  const blink = () => {
    showColon.value = !showColon.value;
    setTimeout(() => {
      showColon.value = !showColon.value;
    }, BLINK_DELAY);
  };

  watch(time, () => {
    if (!canBlink) canBlink = true;
  });

  return {
    showColon,
  };
}
