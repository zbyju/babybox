<template>
  <div id="container">
    <iframe
      v-show="state === CameraState.Ok"
      name="vivotek"
      scrolling="no"
      :style="[topBorder, maxSize]"
    />
  </div>
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
  import { computed, onMounted, ref } from "vue";

  import { useConfigStore } from "@/pinia/configStore";
  import { CameraState } from "@/types/panel/camera.types";

  const props = defineProps<{
    displayTopBorder: boolean;
    maxH?: number | undefined;
    maxW?: number | undefined;
  }>();

  const emit = defineEmits<{
    (e: "updatedImage", width: number, height: number): void;
  }>();

  const state = ref(CameraState.Loading);

  const topBorder = computed(() =>
    props.displayTopBorder ? {} : { borderTopWidth: "0px" },
  );

  const maxSize = computed(() => ({
    ...(props.maxH === undefined ? {} : { maxHeight: `${props.maxH}px` }),
    ...(props.maxW === undefined ? {} : { maxWidth: `${props.maxW}px` }),
  }));

  const configStore = useConfigStore();
  const { camera } = storeToRefs(configStore);

  onMounted(() => {
    try {
      window.open(`http://${camera.value.ip}/`, "vivotek");
      console.log("camera ok");
      state.value = CameraState.Ok;
    } catch (err) {
      console.log("Camera error", err);
      state.value = CameraState.Error;
    }
  });
</script>

<style lang="stylus">
  #container {
      overflow:hidden;
      margin:auto;
  }
  #container iframe {
      width:900px;
      height:700px;
      margin-left:-234px;
      margin-top:-126px;
  }
</style>
