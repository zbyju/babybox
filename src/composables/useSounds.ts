import { AppState } from "@/types/main";
import { Howl } from "howler";

export const useSounds = () => {
  return new BabyboxSoundPlayer();
};

class BabyboxSoundPlayer {
  playing;
  private readonly SOUND_PATH: string;

  constructor() {
    this.playing = null;
    this.SOUND_PATH = "@/assets/sounds/";
  }

  private loadHowl(name: string, loop: boolean) {
    if (!name || name == null || name == undefined || name == "") return null;
    const sound = require(`@/assets/sounds/${name}.mp3`);
    return new Howl({
      src: [sound],
      autoplay: false,
      loop: loop,
    });
  }

  updateSound(newValue: AppState, prevValue: AppState) {
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

    this.playing.play();
  }

  stopSound() {
    this.playing?.stop();
  }
}
