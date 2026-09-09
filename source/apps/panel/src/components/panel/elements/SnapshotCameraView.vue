<template>
  <img
    v-show="state === CameraState.Ok"
    :src="url"
    :style="{
      borderTopWidth: props.displayTopBorder ? undefined : '0px',
      maxHeight: props.maxH + 'px',
      maxWidth: props.maxW + 'px',
    }"
    @error="onVisibleLoadError"
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
  const { url, state } = useCamera(camera.value);

  /*
   * The off-screen probe already loaded this url, so a failure here is the
   * visible img alone. Without this the operator gets a broken-image icon and
   * the panel still reports Ok. The next frame that loads clears the state.
   */
  const onVisibleLoadError = () => {
    state.value = CameraState.Error;
  };
</script>
