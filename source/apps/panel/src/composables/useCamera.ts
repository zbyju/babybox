import type { Ref } from "vue";
import { onUnmounted, ref } from "vue";

import { type CameraConfig } from "@/types/panel/config.types";
import { getURLPostfix, stringToCameraType } from "@/utils/panel/camera";

/*
 * How long to wait for a frame that reports neither load nor error.
 * A stalled TCP connection can hang for minutes, so we drop the frame and
 * start a new one instead. Long enough not to cut off a slow camera,
 * short enough that a stuck feed recovers without anyone visiting the site.
 */
const stalledFrameTimeout = 15000;

export interface Camera {
  url: Ref<string>;
  imageFinished: () => void;
}

/**
 * Gives the url to the camera image and keeps refreshing it.
 *
 * Refreshing is self-clocking: the next url is scheduled once the caller says
 * the current image finished, so a camera slower than `config.updateDelay`
 * never gets a second request while the first is still running.
 * `config.updateDelay` is the minimum gap between two refreshes, measured from
 * one refresh to the next, so a fast camera still updates at the set rate.
 *
 * The caller MUST call `imageFinished` from both the image's load and its error
 * handler. Calling it only on load would stop the feed for good on the first
 * error; missing both leaves the feed running at the stalled-frame timeout.
 *
 * All timers stop on the calling component's unmount.
 *
 * @param config - camera config
 * @param onUpdate - called after every url change
 */
export default function useCamera(
  config: CameraConfig,
  onUpdate?: () => any,
): Camera {
  const url = ref("");

  let stopped = false;
  let nextTimer: ReturnType<typeof setTimeout> | undefined;
  let stallTimer: ReturnType<typeof setTimeout> | undefined;
  let waitingForImage = false;
  let lastRefreshAt = 0;

  const clearTimers = () => {
    if (nextTimer !== undefined) clearTimeout(nextTimer);
    if (stallTimer !== undefined) clearTimeout(stallTimer);
    nextTimer = undefined;
    stallTimer = undefined;
  };

  const refresh = () => {
    if (stopped) return;

    const cameraType = stringToCameraType(config.cameraType);
    const time = Date.now();
    lastRefreshAt = performance.now();
    url.value = `http://${config.username}:${config.password}@${
      config.ip
    }${getURLPostfix(cameraType)}${time.toString()}`;

    waitingForImage = true;
    stallTimer = setTimeout(() => {
      waitingForImage = false;
      refresh();
    }, stalledFrameTimeout);

    if (onUpdate) {
      onUpdate();
    }
  };

  const scheduleRefresh = (delay: number) => {
    if (stopped) return;
    nextTimer = setTimeout(refresh, delay);
  };

  const imageFinished = () => {
    // The empty starting src can fire load or error before the first refresh.
    if (stopped || !waitingForImage) return;
    waitingForImage = false;
    clearTimers();
    /*
     * performance.now(), not Date.now(): this runs unattended for months and an
     * NTP step backwards would make the gap negative, pushing the next refresh
     * out by the size of the step. The stall watchdog is already cleared above,
     * so nothing would recover the feed.
     */
    const sinceRefresh = performance.now() - lastRefreshAt;
    scheduleRefresh(Math.max(config.updateDelay - sinceRefresh, 0));
  };

  scheduleRefresh(config.updateDelay);

  onUnmounted(() => {
    stopped = true;
    clearTimers();
  });

  return { url, imageFinished };
}
