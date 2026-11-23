import { Howl } from "howler";
import { describe, expect, it, vi } from "vitest";

vi.mock("howler", () => ({
  Howl: vi.fn().mockImplementation(() => ({
    on: vi.fn(), loop: vi.fn(), stop: vi.fn(), play: vi.fn(),
  })),
}));

import { useSounds } from "./useSounds";

describe("panel audio mode", () => {
  it("mutes all sounds only in local-ai while retaining playback", () => {
    const calls = vi.mocked(Howl).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    for (const [options] of calls) {
      expect(options.mute).toBe(import.meta.env.MODE === "local-ai");
    }
    const player = useSounds();
    player.playSound("Start");
    expect(player.playing?.play).toHaveBeenCalled();
  });
});
