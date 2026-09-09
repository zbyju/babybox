import { Howl } from "howler";

import type { PanelState } from "@/types/panel/main.types";

/*
  Howler fetches and decodes the file when the Howl is built, so building one per
  playback delays every alert by a fetch plus a decode.
  The cache is module level, not per player, because MainView is remounted every
  time the user navigates back to "/".
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
    if (this.playing) this.playing.stop();

    const howl = this.loadHowl(name, loop);
    if (howl === null) return;

    this.playing = howl;

    /* Reused instances keep the playhead of the last run, so restart from the beginning. */
    this.playing.stop();
    this.playing.play();
  }

  stopSound() {
    this.playing?.stop();
  }
}
