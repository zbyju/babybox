<template>
  <video
    v-show="state === CameraState.Ok"
    ref="videoRef"
    autoplay
    muted
    :style="{
      borderTopWidth: props.displayTopBorder ? undefined : '0px',
      maxHeight: props.maxH + 'px',
      maxWidth: props.maxW + 'px',
    }"
  />
  <div
    v-show="state === CameraState.Error"
    class="camera-error"
    :style="{
      borderTopWidth: props.displayTopBorder ? undefined : '0px',
    }"
  >
    <h4>Error</h4>
    <p>Chyba při načítání kamery.</p>
  </div>
  <div
    v-show="state === CameraState.Reconnecting"
    class="camera-loading"
    :style="{
      borderTopWidth: props.displayTopBorder ? undefined : '0px',
    }"
  >
    <h4>Obnovování spojení ke kameře...</h4>
  </div>
  <div
    v-show="state === CameraState.Loading"
    class="camera-loading"
    :style="{
      borderTopWidth: props.displayTopBorder ? undefined : '0px',
    }"
  >
    <h4>Načítám</h4>
  </div>
</template>

<script lang="ts" setup>
  import Hls from "hls.js";
  import { storeToRefs } from "pinia";
  import { onMounted, onUnmounted, ref } from "vue";

  import { useConfigStore } from "@/pinia/configStore";

  const props = defineProps<{
    displayTopBorder: boolean;
    maxH?: number;
    maxW?: number;
  }>();

  enum CameraState {
    Ok = 0,
    Loading = 1,
    Error = 2,
    Reconnecting = 3,
  }

  // --- Reconnect constants ---
  const MIN_RECONNECT_DELAY = 5000;
  const MAX_RECONNECT_DELAY = 120000;

  // --- Stall detection constants (#1) ---
  const STALL_CHECK_INTERVAL = 5000; // check every 5 seconds
  const MAX_STALL_COUNT = 3; // 3 consecutive stalls = 15 seconds frozen

  // --- Non-fatal error monitoring constants (#3) ---
  const MAX_NON_FATAL_ERRORS = 5;

  // --- Backend health polling constants (#4) ---
  const HEALTH_CHECK_INTERVAL = 30000; // poll every 30 seconds

  // --- Core state ---
  const state = ref(CameraState.Loading);
  const videoRef = ref<HTMLVideoElement | null>(null);
  let hls: Hls | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;
  let mediaRecoveryAttempted = false;
  let destroyed = false;

  // --- Stall detection state (#1) ---
  let stallCheckTimer: ReturnType<typeof setInterval> | null = null;
  let lastKnownTime = -1;
  let stallCount = 0;

  // --- Non-fatal error state (#3) ---
  let nonFatalErrorCount = 0;

  // --- Backend health polling state (#4) ---
  let healthCheckTimer: ReturnType<typeof setInterval> | null = null;

  const configStore = useConfigStore();
  const { backend } = storeToRefs(configStore);

  const baseUrl = `http://localhost:${backend.value.port}${backend.value.url}`;
  const streamUrl = `${baseUrl}/camera/stream/stream.m3u8`;
  const statusUrl = `${baseUrl}/camera/status`;

  // =============================================
  // Timer management
  // =============================================

  function clearReconnectTimer(): void {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  function clearStallCheckTimer(): void {
    if (stallCheckTimer !== null) {
      clearInterval(stallCheckTimer);
      stallCheckTimer = null;
    }
  }

  function clearHealthCheckTimer(): void {
    if (healthCheckTimer !== null) {
      clearInterval(healthCheckTimer);
      healthCheckTimer = null;
    }
  }

  function clearAllMonitoring(): void {
    clearStallCheckTimer();
    clearHealthCheckTimer();
  }

  // =============================================
  // Stall detection (#1)
  // =============================================

  function startStallCheck(): void {
    clearStallCheckTimer();
    lastKnownTime = -1;
    stallCount = 0;

    stallCheckTimer = setInterval(() => {
      if (destroyed || state.value !== CameraState.Ok) return;

      const video = videoRef.value;
      if (!video) return;

      const currentTime = video.currentTime;

      if (lastKnownTime >= 0 && currentTime === lastKnownTime) {
        stallCount++;
        if (stallCount >= MAX_STALL_COUNT) {
          // Video has been frozen for MAX_STALL_COUNT * STALL_CHECK_INTERVAL ms
          scheduleReconnect();
          return;
        }
      } else {
        // Video is advancing — reset stall counter
        stallCount = 0;
      }

      lastKnownTime = currentTime;
    }, STALL_CHECK_INTERVAL);
  }

  // =============================================
  // Video element event listeners (#2)
  // =============================================

  function onVideoStalled(): void {
    if (state.value !== CameraState.Ok) return;
    // Accelerate stall detection: set stallCount so only one more check triggers reconnect
    stallCount = Math.max(stallCount, MAX_STALL_COUNT - 1);
  }

  function onVideoWaiting(): void {
    if (state.value !== CameraState.Ok) return;
    // Same acceleration as stalled — the next stall check will trigger reconnect
    // if the video hasn't advanced by then
    stallCount = Math.max(stallCount, MAX_STALL_COUNT - 1);
  }

  function addVideoEventListeners(video: HTMLVideoElement): void {
    video.addEventListener("stalled", onVideoStalled);
    video.addEventListener("waiting", onVideoWaiting);
  }

  function removeVideoEventListeners(video: HTMLVideoElement): void {
    video.removeEventListener("stalled", onVideoStalled);
    video.removeEventListener("waiting", onVideoWaiting);
  }

  // =============================================
  // Backend health polling (#4)
  // =============================================

  function startHealthCheck(): void {
    clearHealthCheckTimer();

    healthCheckTimer = setInterval(async () => {
      if (destroyed || state.value !== CameraState.Ok) return;

      const ready = await checkStreamReady();
      if (!ready && state.value === CameraState.Ok) {
        // Backend says stream is not ready — proactively reconnect
        scheduleReconnect();
      }
    }, HEALTH_CHECK_INTERVAL);
  }

  // =============================================
  // Start all monitoring (called when stream is Ok)
  // =============================================

  function startMonitoring(): void {
    startStallCheck();
    startHealthCheck();
  }

  // =============================================
  // Reconnect helpers
  // =============================================

  function getReconnectDelay(): number {
    return Math.min(
      MIN_RECONNECT_DELAY * Math.pow(2, reconnectAttempt),
      MAX_RECONNECT_DELAY
    );
  }

  async function checkStreamReady(): Promise<boolean> {
    try {
      const res = await fetch(statusUrl);
      if (!res.ok) return false;
      const data = await res.json();
      return data.streamReady === true;
    } catch {
      return false;
    }
  }

  function destroyHls(): void {
    if (hls) {
      hls.destroy();
      hls = null;
    }
  }

  // =============================================
  // HLS setup
  // =============================================

  function setupHls(video: HTMLVideoElement): void {
    destroyHls();

    hls = new Hls();
    hls.loadSource(streamUrl);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      state.value = CameraState.Ok;
      reconnectAttempt = 0;
      mediaRecoveryAttempted = false;
      nonFatalErrorCount = 0;
      startMonitoring();
      video.play();
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      // --- Non-fatal error monitoring (#3) ---
      if (!data.fatal) {
        nonFatalErrorCount++;
        if (nonFatalErrorCount >= MAX_NON_FATAL_ERRORS) {
          // Too many non-fatal errors indicate the stream source is unhealthy
          scheduleReconnect();
        }
        return;
      }

      if (
        data.type === Hls.ErrorTypes.MEDIA_ERROR &&
        !mediaRecoveryAttempted
      ) {
        // First attempt: use hls.js built-in media error recovery
        mediaRecoveryAttempted = true;
        hls?.recoverMediaError();
        return;
      }

      // Fatal error that we can't recover from inline — schedule reconnect
      scheduleReconnect();
    });
  }

  function setupNativeHls(video: HTMLVideoElement): void {
    video.src = streamUrl;

    const onLoaded = () => {
      state.value = CameraState.Ok;
      reconnectAttempt = 0;
      nonFatalErrorCount = 0;
      startMonitoring();
      video.play();
    };

    const onError = () => {
      scheduleReconnect();
    };

    // Remove previous listeners to avoid duplicates on retry
    video.removeEventListener("loadedmetadata", onLoaded);
    video.removeEventListener("error", onError);
    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("error", onError);
  }

  // =============================================
  // Reconnect logic
  // =============================================

  async function scheduleReconnect(): Promise<void> {
    if (destroyed) return;

    state.value = CameraState.Reconnecting;
    clearAllMonitoring();
    destroyHls();

    const delay = getReconnectDelay();
    reconnectAttempt++;

    clearReconnectTimer();
    reconnectTimer = setTimeout(async () => {
      if (destroyed) return;

      const video = videoRef.value;
      if (!video) {
        // Video element gone (component unmounted race) — stop retrying
        return;
      }

      // Check with backend if stream is ready before attempting to reconnect
      const ready = await checkStreamReady();
      if (!ready) {
        // Stream not ready yet — schedule another attempt
        scheduleReconnect();
        return;
      }

      // Stream is ready — attempt to reconnect
      mediaRecoveryAttempted = false;
      nonFatalErrorCount = 0;
      if (Hls.isSupported()) {
        setupHls(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        setupNativeHls(video);
      }
    }, delay);
  }

  // =============================================
  // Lifecycle
  // =============================================

  onMounted(() => {
    const video = videoRef.value;
    if (!video) {
      state.value = CameraState.Error;
      return;
    }

    // Add video element event listeners for stall acceleration (#2)
    addVideoEventListeners(video);

    if (Hls.isSupported()) {
      setupHls(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      setupNativeHls(video);
    } else {
      state.value = CameraState.Error;
    }
  });

  onUnmounted(() => {
    destroyed = true;
    clearReconnectTimer();
    clearAllMonitoring();
    destroyHls();

    const video = videoRef.value;
    if (video) {
      removeVideoEventListeners(video);
    }
  });
</script>

<style lang="stylus">
  video
    max-height 100%
    height 100%
    width calc(100% - 4px)
    object-fit contain
    overflow hidden
    border 3px solid color-border-primary
    border-radius 0 0 5px 5px
    align-self center
    min-width 160px
    min-height 90px
</style>
