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
  }

  const state = ref(CameraState.Loading);
  const videoRef = ref<HTMLVideoElement | null>(null);
  let hls: Hls | null = null;

  const configStore = useConfigStore();
  const { backend } = storeToRefs(configStore);

  const streamUrl = `http://localhost:${backend.value.port}${backend.value.url}/camera/stream/stream.m3u8`;

  onMounted(() => {
    const video = videoRef.value;
    if (!video) {
      state.value = CameraState.Error;
      return;
    }

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        state.value = CameraState.Ok;
        video.play();
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          state.value = CameraState.Error;
        }
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS support
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", () => {
        state.value = CameraState.Ok;
        video.play();
      });
      video.addEventListener("error", () => {
        state.value = CameraState.Error;
      });
    } else {
      state.value = CameraState.Error;
    }
  });

  onUnmounted(() => {
    if (hls) {
      hls.destroy();
      hls = null;
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
