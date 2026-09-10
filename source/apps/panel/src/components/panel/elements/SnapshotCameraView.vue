<template>
  <img
    v-show="state === CameraState.Ok"
    :src="url || undefined"
    :style="{
      borderTopWidth: props.displayTopBorder ? undefined : '0px',
      maxHeight: props.maxH + 'px',
      maxWidth: props.maxW + 'px',
    }"
    @error="onVisibleLoadError"
    @load="onVisibleLoad"
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
   * The off-screen probe drives the state, but the visible img can still fail
   * on its own, so it reports both outcomes here.
   *
   * Both handlers are needed. Without @load nothing here can report success,
   * so the only way out of Error is the next probe success. Without @error the
   * operator gets a broken-image icon while the panel reports Ok.
   *
   * The src is left off while url is empty. Vue would render src="", which the
   * browser resolves to the page URL and fails, and that raised Error before
   * the first probe had even settled.
   */
  const onVisibleLoad = () => {
    state.value = CameraState.Ok;
  };

  const onVisibleLoadError = () => {
    state.value = CameraState.Error;
  };
</script>
