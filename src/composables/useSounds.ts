interface Sound {
  name: string;
  sound: any;
}

export interface BabyboxSounds {
  activation: Sound;
  wasOpened: Sound;
  opening: Sound;
  start: Sound;
  connectionLost: Sound;
}

import { Howl } from "howler";

export const useSounds = (): BabyboxSounds => {
  const activation = require("@/assets/sounds/Aktivace.mp3");
  const wasOpened = require("@/assets/sounds/BylOtevren.mp3");
  const opening = require("@/assets/sounds/Otevirani.mp3");
  const start = require("@/assets/sounds/Start.mp3");
  const connectionLost = require("@/assets/sounds/ZtrataSpojeni.mp3");

  return {
    activation: {
      name: "Aktivace",
      sound: new Howl({
        src: [activation],
        autoplay: false,
        loop: true,
      }),
    },
    wasOpened: {
      name: "BylOtevren",
      sound: new Howl({
        src: [wasOpened],
        autoplay: false,
        loop: true,
      }),
    },
    opening: {
      name: "Otevirani",
      sound: new Howl({
        src: [opening],
        autoplay: false,
        loop: true,
      }),
    },
    start: {
      name: "Start",
      sound: new Howl({
        src: [start],
        autoplay: false,
        loop: true,
      }),
    },
    connectionLost: {
      name: "ZtrataSpojeni",
      sound: new Howl({
        src: [connectionLost],
        autoplay: false,
        loop: true,
      }),
    },
  };
};
