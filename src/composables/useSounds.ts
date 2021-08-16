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
