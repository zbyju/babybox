import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { desktopPanel } from "../desktopPanel.js";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("keeps an existing desktop tab that reconnects after backend startup", () => {
  const open = vi.fn();
  const panel = desktopPanel(open);
  panel.openIfMissing();
  vi.advanceTimersByTime(10_000);
  panel.checkIn("::ffff:127.0.0.1");
  vi.advanceTimersByTime(20_000);
  expect(open).not.toHaveBeenCalled();
});

it("opens a tab if only a remote client checks in", () => {
  const open = vi.fn();
  const panel = desktopPanel(open);
  panel.openIfMissing();
  panel.checkIn("192.0.2.20");
  vi.advanceTimersByTime(10_000);
  expect(open).not.toHaveBeenCalled();
  vi.advanceTimersByTime(20_000);
  expect(open).toHaveBeenCalledOnce();
});
