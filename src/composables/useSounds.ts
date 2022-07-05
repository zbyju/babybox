import type { AppState } from "@/types/panel/main";
import { Howl } from "howler";

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
        if (!name || name == null || name == undefined || name == "")
            return null;
        return new Howl({
            src: [`/sounds/${name}.mp3`],
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
