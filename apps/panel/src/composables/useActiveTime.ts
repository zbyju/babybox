import type { Moment } from "moment";
import type { Ref } from "vue";
import { ref, watch } from "vue";

import type { Maybe } from "@/types/generic.types";

/**
 * This composable returns a new time when it gets updated ONLY IF the babybox is not active.
 *
 * The expected behaviour is: Keep updating the time, but when the babybox is active then the clock stops at the time of activation.
 * @param time - current time
 * @param active - is babybox active
 * @returns
 */
export default function useActiveTime(
  time: Ref<Maybe<Moment>>,
  active: Ref<boolean>,
) {
  const result = ref(time.value);
  watch(time, (newTime, _) => {
    if (!active.value || result.value === undefined) {
      result.value = newTime;
    }
  });
  return result;
}
