<template>
  <img
    v-show="state === CameraState.Ok"
    :src="url || undefined"
    :style="{
      borderTopWidth: props.displayTopBorder ? undefined : '0px',
      maxHeight: props.maxH + 'px',
      maxWidth: props.maxW + 'px',
    }"
    @error="onError"
    @load="onLoad"
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
  import { storeToRefs } from "pinia";

  import useCamera from "@/composables/useCamera";
  import { useConfigStore } from "@/pinia/configStore";
  import { CameraState } from "@/types/panel/camera.types";

  const props = defineProps<{
    displayTopBorder: boolean;
    maxH?: number;
    maxW?: number;
  }>();

  const configStore = useConfigStore();
  const { camera } = storeToRefs(configStore);
  /*
   * This img is the element that fetches, so its two handlers are what tell
   * useCamera a frame settled and when to ask for the next one.
   *
   * The src is left off while url is empty. Vue would render src="", which the
   * browser resolves to the page URL and fails, and that raised Error before
   * the first frame had even been asked for.
   */
  const { url, state, onLoad, onError } = useCamera(camera.value);
</script>
