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
    const active = computed(() => false);
    const { showColon } = useBigClockColon(time, active, 50);
    expect(showColon).toBeDefined();
  });

  test("showColon should be true if babybox is active", () => {
    const storeTime = ref(moment());
    const time = computed(() => storeTime.value);
    const active = computed(() => true);
    const { showColon } = useBigClockColon(time, active, 50);
    expect(showColon).toBeDefined();
    expect(showColon).toBeTruthy();
  });
});
