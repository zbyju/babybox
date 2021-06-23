import { getCurrentTimePC } from "@/utils/time";

test("Current time PC is now", () => {
  expect(getCurrentTimePC().diff(Date.now())).toBeCloseTo(0);
});
