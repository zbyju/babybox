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

  const MIN_RECONNECT_DELAY = 5000;
  const MAX_RECONNECT_DELAY = 120000;

  const state = ref(CameraState.Loading);
  const videoRef = ref<HTMLVideoElement | null>(null);
  let hls: Hls | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempt = 0;
  let mediaRecoveryAttempted = false;
  let destroyed = false;

  const configStore = useConfigStore();
  const { backend } = storeToRefs(configStore);

  const baseUrl = `http://localhost:${backend.value.port}${backend.value.url}`;
  const streamUrl = `${baseUrl}/camera/stream/stream.m3u8`;
  const statusUrl = `${baseUrl}/camera/status`;

  function clearReconnectTimer(): void {
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

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

  function setupHls(video: HTMLVideoElement): void {
    destroyHls();

    hls = new Hls();
    hls.loadSource(streamUrl);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      state.value = CameraState.Ok;
      reconnectAttempt = 0;
      mediaRecoveryAttempted = false;
      video.play();
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;

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

  async function scheduleReconnect(): Promise<void> {
    if (destroyed) return;

    state.value = CameraState.Reconnecting;
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
      if (Hls.isSupported()) {
        setupHls(video);
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        setupNativeHls(video);
      }
    }, delay);
  }

  onMounted(() => {
    const video = videoRef.value;
    if (!video) {
      state.value = CameraState.Error;
      return;
    }

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
    destroyHls();
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
