import moment from "moment";
import { ref, watch } from "vue";
import type { Ref } from "vue";

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
