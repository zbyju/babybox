import moment from "moment";
import { ref, watch, ComputedRef } from "vue";

export default function useBigClockColon(time: ComputedRef<moment.Moment>) {
  const showColon = ref(true);
  let prevTime = time.value;
  const toggleColon = () => {
    if (moment(time.value).diff(prevTime, "seconds") > 0.4) {
      showColon.value = !showColon.value;
      prevTime = time.value;
    }
  };
  watch(time, toggleColon);

  return {
    showColon,
  };
}
