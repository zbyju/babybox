import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { desktopPanel } from "../desktopPanel.js";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("keeps an existing desktop tab that reconnects after backend startup", async () => {
  const open = vi.fn();
  const panel = desktopPanel(open);
  await panel.openIfMissing();
  vi.advanceTimersByTime(10_000);
  panel.checkIn("::ffff:127.0.0.1");
  vi.advanceTimersByTime(20_000);
  expect(open).not.toHaveBeenCalled();
});

it("opens a tab if only a remote client checks in", async () => {
  const open = vi.fn();
  const panel = desktopPanel(open);
  await panel.openIfMissing();
  panel.checkIn("192.0.2.20");
  vi.advanceTimersByTime(10_000);
  expect(open).not.toHaveBeenCalled();
  vi.advanceTimersByTime(20_000);
  expect(open).toHaveBeenCalledOnce();
});

it("lets a cold Firefox session restore a panel before opening its URL", async () => {
  const open = vi.fn();
  const restore = vi.fn(async () => true);
  const panel = desktopPanel(open, restore);
  await panel.openIfMissing();
  expect(restore).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(20_000);
  expect(open).not.toHaveBeenCalled();
  panel.checkIn("127.0.0.1");
  vi.advanceTimersByTime(10_000);
  expect(open).not.toHaveBeenCalled();
});

it("opens the panel once after Firefox startup if no tab is restored", async () => {
  const open = vi.fn();
  const restore = vi.fn(async () => true);
  const panel = desktopPanel(open, restore);
  await panel.openIfMissing();
  await panel.openIfMissing();
  vi.advanceTimersByTime(25_000);
  expect(restore).toHaveBeenCalledOnce();
  expect(open).toHaveBeenCalledOnce();
});
