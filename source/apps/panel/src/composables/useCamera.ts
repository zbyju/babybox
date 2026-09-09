import type { Ref } from "vue";
import { onUnmounted, ref } from "vue";

import type { Maybe } from "@/types/generic.types";
import { CameraState } from "@/types/panel/camera.types";
import { type CameraConfig } from "@/types/panel/config.types";
import { getURLPostfix, stringToCameraType } from "@/utils/panel/camera";

const DEFAULT_UPDATE_DELAY = 1000;

/** Multiple of the update delay after which a snapshot that never answered is dropped. */
const STALL_FACTOR = 3;

/**
 * Loads camera snapshots one at a time.
 *
 * The next snapshot starts only after the current one loads or fails, so a camera
 * slower than the update delay just refreshes less often. Swapping the src on a
 * timer instead aborts the running load, which can leave the view stuck on Error
 * and never show a frame.
 *
 * Each snapshot loads into an off-screen image first, so the returned url changes
 * only once the new frame is ready. That also removes the flicker on refresh.
 *
 * @param config - camera config
 * @param onUpdate - called after every frame that loads
 * @returns url of the newest loaded frame, and the current load state
 */
export default function useCamera(
  config: CameraConfig,
  onUpdate?: () => any,
): { url: Ref<string>; state: Ref<CameraState> } {
  const url = ref("");
  const state = ref(CameraState.Loading);
  const delay = config.updateDelay || DEFAULT_UPDATE_DELAY;

  let stopped = false;
  let nextTimer: Maybe<ReturnType<typeof setTimeout>>;
  let stallTimer: Maybe<ReturnType<typeof setTimeout>>;

  const buildUrl = () => {
    const cameraType = stringToCameraType(config.cameraType);
    const time = new Date().getTime().toString();
    return `http://${config.username}:${config.password}@${
      config.ip
    }${getURLPostfix(cameraType)}${time}`;
  };

  const load = () => {
    if (stopped) return;

    const probe = new Image();
    let settled = false;

    const settle = (loaded: boolean, abort = false) => {
      if (settled) return;
      settled = true;
      clearTimeout(stallTimer);
      probe.onload = null;
      probe.onerror = null;
      if (abort) probe.src = "";

      if (loaded) {
        url.value = probe.src;
        state.value = CameraState.Ok;
        if (onUpdate) onUpdate();
      } else {
        state.value = CameraState.Error;
      }

      if (!stopped) nextTimer = setTimeout(load, delay);
    };

    probe.onload = () => settle(true);
    probe.onerror = () => settle(false);

    /*
     * Some cameras accept the connection and then never answer,
     * so neither onload nor onerror ever fires.
     */
    stallTimer = setTimeout(() => settle(false, true), delay * STALL_FACTOR);

    probe.src = buildUrl();
  };

  load();

  onUnmounted(() => {
    stopped = true;
    clearTimeout(nextTimer);
    clearTimeout(stallTimer);
  });

  return { url, state };
}
