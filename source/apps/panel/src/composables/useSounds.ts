import { Howl } from "howler";

import type { PanelState } from "@/types/panel/main.types";

/*
  Howler fetches and decodes the file when the Howl is built, so building one per
  playback delays every alert by a fetch plus a decode.
  The module-level cache preloads the sounds used by the panel.
*/
const howls = new Map<string, Howl>();

const buildHowl = (name: string): Howl => {
  const howl = new Howl({
    src: [`/sounds/${name}.mp3`],
    autoplay: false,
    preload: true,
    loop: true,
  });
  howls.set(name, howl);
  /*
    Drop a howl that failed to load so the next alert builds a fresh one.
    Without this a single failed fetch would keep that alert silent for the rest
    of the day.
  */
  howl.on("loaderror", () => {
    if (howls.get(name) === howl) howls.delete(name);
  });
  return howl;
};

const getHowl = (name: string): Howl => howls.get(name) ?? buildHowl(name);

/*
  Every file in public/sounds.
  A name outside this list still works, it is just built on first use.
*/
["Aktivace", "BylOtevren", "Otevirani", "Start", "ZtrataSpojeni"].forEach(
  getHowl,
);

/**
 * This composable creates a new SoundPlayer. This class manages what sounds are being played.
 * @returns BabyboxSoundPlayer
 */
export const useSounds = () => {
  return new BabyboxSoundPlayer();
};

class BabyboxSoundPlayer {
  playing: Howl | null;
  private requested: { name: string; loop: boolean } | undefined;
  private claim: AbortController | undefined;
  private ownsAudio = false;

  constructor() {
    this.playing = null;
  }

  private loadHowl(name: string, loop: boolean) {
    if (!name || name == null || name == undefined || name == "") return null;
    const howl = getHowl(name);
    howl.loop(loop);
    return howl;
  }

  updateSound(newValue: PanelState, prevValue: PanelState) {
    if (
      newValue.message?.sound !== prevValue.message?.sound &&
      newValue.message?.sound != null &&
      newValue.message?.sound != undefined &&
      newValue.message?.sound != ""
    ) {
      this.playSound(newValue.message.sound);
    }
    if (
      newValue.message == null ||
      newValue.message == undefined ||
      newValue.message.sound == null ||
      newValue.message.sound == undefined ||
      newValue.message.sound === ""
    ) {
      this.stopSound();
    }
  }

  playSound(name: string, loop = true) {
    this.requested = { name, loop };
    if (
      this.ownsAudio ||
      typeof navigator === "undefined" ||
      !navigator.locks
    ) {
      this.playRequested();
      return;
    }
    if (this.claim) return;
    const claim = new AbortController();
    this.claim = claim;
    void navigator.locks
      .request(
        "babybox-panel-alarm-audio",
        { signal: claim.signal },
        async () => {
          if (claim.signal.aborted) return;
          const released = new Promise<void>((resolve) => {
            claim.signal.addEventListener("abort", () => resolve(), {
              once: true,
            });
          });
          this.ownsAudio = true;
          this.playRequested();
          await released;
        },
      )
      .catch(() => {
        // If the browser cannot arbitrate, keep alarms audible.
        if (this.claim === claim && !claim.signal.aborted) {
          this.ownsAudio = false;
          this.playRequested();
        }
      })
      .finally(() => {
        if (this.claim === claim) this.claim = undefined;
      });
  }

  private playRequested() {
    this.playing?.stop();
    const request = this.requested;
    if (!request) return;

    const howl = this.loadHowl(request.name, request.loop);
    if (howl === null) return;

    this.playing = howl;

    /* Reused instances keep the playhead of the last run, so restart from the beginning. */
    this.playing.stop();
    this.playing.play();
  }

  stopSound() {
    this.playing?.stop();
    this.playing = null;
    this.requested = undefined;
    this.ownsAudio = false;
    this.claim?.abort();
    this.claim = undefined;
  }
}
