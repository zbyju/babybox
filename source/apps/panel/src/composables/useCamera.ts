import type { Ref } from "vue";
import { onUnmounted, ref } from "vue";

import type { Maybe } from "@/types/generic.types";
import { CameraState } from "@/types/panel/camera.types";
import { type CameraConfig } from "@/types/panel/config.types";
import { getURLPostfix } from "@/utils/panel/camera";

const DEFAULT_UPDATE_DELAY = 1000;

/** Multiple of the update delay after which a snapshot that never answered is dropped. */
const STALL_FACTOR = 3;

/*
 * Floor for the stall timeout.
 * The update delay is a display preference, so a short one must not become a
 * network timeout that no camera can meet.
 */
const MIN_LOAD_TIMEOUT = 5000;

/* A 1x1 transparent GIF. Assigning it aborts a load that never answered. */
const BLANK =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * Loads camera snapshots one at a time into the caller's own `img`.
 *
 * The next snapshot starts only after the current one loads or fails, so a
 * camera slower than the update delay just refreshes less often. Swapping the
 * src on a timer instead aborts the running load, which can leave the view
 * stuck on Error and never show a frame.
 *
 * The element the caller renders is the element that fetches, so a frame costs
 * one request. An off-screen probe would remove the refresh flicker, but it
 * fetches every frame twice: the camera is cross-origin with no CORS header,
 * so a canvas hand-over taints, and the url carries credentials, so `fetch`
 * refuses it and there is no blob either.
 *
 * A frame is dropped once it passes the stall timeout, which is at least
 * MIN_LOAD_TIMEOUT and never below it, whatever the update delay is.
 *
 * The caller must wire both `onLoad` and `onError` to its `img`. They are the
 * only way this composable learns that a frame settled.
 *
 * @param config - camera config
 * @param onUpdate - called after every frame that loads
 * @returns url for the img src, the current load state, and the two handlers
 */
export default function useCamera(
  config: CameraConfig,
  onUpdate?: () => void,
): {
  url: Ref<string>;
  state: Ref<CameraState>;
  onLoad: () => void;
  onError: () => void;
} {
  const url = ref("");
  const state = ref(CameraState.Loading);
  const delay = config.updateDelay || DEFAULT_UPDATE_DELAY;

  let stopped = false;
  let nextTimer: Maybe<ReturnType<typeof setTimeout>>;
  let stallTimer: Maybe<ReturnType<typeof setTimeout>>;
  /* True while no frame is in flight, so a late event from an aborted load
   * cannot settle the frame that came after it. */
  let settled = true;

  const buildUrl = () => {
    const time = new Date().getTime().toString();
    return `http://${config.username}:${config.password}@${
      config.ip
    }${getURLPostfix(config.cameraType)}${time}`;
  };

  const settle = (loaded: boolean, stalled = false) => {
    if (settled) return;
    settled = true;
    clearTimeout(stallTimer);

    state.value = loaded ? CameraState.Ok : CameraState.Error;
    if (loaded && onUpdate) onUpdate();

    /*
     * A stalled load is still open, so point the element at a blank frame to
     * drop it. Its abort event arrives while settled is true and is ignored.
     */
    if (stalled) url.value = BLANK;

    if (!stopped) nextTimer = setTimeout(load, delay);
  };

  const load = () => {
    if (stopped) return;

    settled = false;

    /*
     * Some cameras accept the connection and then never answer,
     * so neither load nor error ever fires on the element.
     */
    const loadTimeout = Math.max(delay * STALL_FACTOR, MIN_LOAD_TIMEOUT);
    stallTimer = setTimeout(() => settle(false, true), loadTimeout);

    url.value = buildUrl();
  };

  load();

  onUnmounted(() => {
    stopped = true;
    clearTimeout(nextTimer);
    clearTimeout(stallTimer);
  });

  return {
    url,
    state,
    onLoad: () => settle(true),
    onError: () => settle(false),
  };
}
