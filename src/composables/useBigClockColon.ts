import moment from "moment";
import { ref, watch, ComputedRef } from "vue";
import _ from "lodash";

export default function useBigClockColon(time: ComputedRef<moment.Moment>) {
  const BLINK_DELAY = 1000;

  const showColon = ref(true);

  const blink = () => {
    showColon.value = !showColon.value;
    setTimeout(() => {
      showColon.value = !showColon.value;
    }, BLINK_DELAY);
  };
  const throttledBlink = _.throttle(blink, BLINK_DELAY * 2);

  watch(time, throttledBlink);

  return {
    showColon,
  };
}
