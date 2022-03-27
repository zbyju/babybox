import moment from "moment";
import { ComputedRef, ref, watch } from "vue";

export default function useActiveTime(
  time: ComputedRef<moment.Moment>,
  active: ComputedRef<boolean>
) {
  const result = ref(time.value);
  watch(time, (newTime, oldTime) => {
    if (!active.value) {
      result.value = newTime;
    }
  });
  return result;
}
