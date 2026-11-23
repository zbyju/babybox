import { expect, it, vi } from "vitest";

import { useSounds } from "./useSounds";

const { play, stop } = vi.hoisted(() => ({
  play: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("howler", () => ({
  Howl: class {
    play = play;
    stop = stop;
    on() {}
    loop() {}
  },
}));

it("plays in one tab and hands the current alarm to a waiting tab", async () => {
  let queue = Promise.resolve();
  vi.stubGlobal("navigator", {
    locks: {
      request: vi.fn(
        (_name: string, options: LockOptions, granted: () => Promise<void>) => {
          const claim = queue.then(() => {
            if (!options.signal?.aborted) return granted();
          });
          queue = claim;
          return claim;
        },
      ),
    },
  });
  const owner = useSounds();
  const waiting = useSounds();
  try {
    owner.playSound("Aktivace");
    waiting.playSound("Start");
    waiting.playSound("Otevirani");
    await Promise.resolve();
    expect(play).toHaveBeenCalledTimes(1);
    owner.stopSound();
    await vi.waitFor(() => expect(play).toHaveBeenCalledTimes(2));
    expect(stop.mock.invocationCallOrder[1]).toBeLessThan(
      play.mock.invocationCallOrder[1] ?? 0,
    );
  } finally {
    owner.stopSound();
    waiting.stopSound();
    vi.unstubAllGlobals();
  }
});
