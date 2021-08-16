import useBigClockColon from "@/composables/useBigClockColon";
import { ref, computed } from "vue";
import moment from "moment";

describe("useBigClockColon composable function", () => {
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
