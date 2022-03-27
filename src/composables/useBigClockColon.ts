import _ from "lodash";
import moment from "moment";
import { ComputedRef, ref, Ref, watch } from "vue";

export default function useBigClockColon(
  time: Ref<moment.Moment>,
  active: ComputedRef<boolean>,
  blinkDelay = 1000
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
