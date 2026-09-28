<template>
  <img
    v-show="state === CameraState.Ok"
    v-bind="srcAttr"
    :style="[
      topBorder,
      { maxHeight: props.maxH + 'px', maxWidth: props.maxW + 'px' },
    ]"
    @error="onError"
    @load="onLoad"
  />
  <div
    v-show="state === CameraState.Error"
    class="camera-error"
    :style="topBorder"
  >
    <h4>Error</h4>
    <p>Chyba při načítání kamery.</p>
  </div>
  <div
    v-show="state === CameraState.Loading"
    class="camera-loading"
    :style="topBorder"
  >
    <h4>Načítám</h4>
  </div>
</template>

<script lang="ts" setup>
  import { storeToRefs } from "pinia";
  import { computed } from "vue";

  import useCamera from "@/composables/useCamera";
  import { useConfigStore } from "@/pinia/configStore";
  import { CameraState } from "@/types/panel/camera.types";

  const props = defineProps<{
    displayTopBorder: boolean;
    maxH?: number | undefined;
    maxW?: number | undefined;
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
  const srcAttr = computed(() => (url.value ? { src: url.value } : {}));

  const topBorder = computed(() =>
    props.displayTopBorder ? {} : { borderTopWidth: "0px" },
  );
</script>
