import moment from "moment";
import { ComputedRef, Ref, ref, watch } from "vue";

export default function useActiveTime(
  time: Ref<moment.Moment>,
  active: Ref<boolean>
) {
  const result = ref(time.value);
  watch(time, (newTime, oldTime) => {
    if (!active.value) {
      result.value = newTime;
    }
  });
  return result;
}
