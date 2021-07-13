import useBigClockColon from "@/composables/useBigClockColon";
import { CameraConfig } from "@/types/main";
import { ref, computed } from "vue";
import moment from "moment";
import store from "@/store";

describe("useBigClockColon composable function", () => {
  const DELAY = 20;

  afterAll(() => {
    jest.useRealTimers();
  });

  test("showColon should be defined", () => {
    const storeTime = ref(moment());
    const time = computed(() => storeTime.value);
    const { showColon } = useBigClockColon(time, 50);
    expect(showColon).toBeDefined();
  });

  test("showColon should 'blink' when time changes", () => {
    jest.useFakeTimers();

    let i = 0; // Time value
    const storeTime = ref(moment(i));
    const time = computed(() => storeTime.value);
    const { showColon } = useBigClockColon(time, DELAY);
    const colonNow = showColon.value;
    ++i;
    storeTime.value = moment(i);
    jest.advanceTimersByTime(DELAY);
    expect(showColon.value).not.toEqual(colonNow);
  });

  /*test("showColon should not 'blink' too frequently", () => {
    jest.useFakeTimers();
    const { showColon } = useBigClockColon(time, 50);
    expect(showColon).toBeDefined();
  });*/
});
