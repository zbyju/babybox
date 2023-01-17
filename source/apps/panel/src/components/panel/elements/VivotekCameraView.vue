<template>
  <div id="container">
    <iframe
      v-show="state === CameraState.Ok"
      ref="imageRef"
      name="vivotek"
      scrolling="no"
      :style="{
        borderTopWidth: props.displayTopBorder ? undefined : '0px',
        maxHeight: props.maxH + 'px',
        maxWidth: props.maxW + 'px',
      }"
    />
  </div>
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
  import { onMounted, ref } from "vue";

  import { useConfigStore } from "@/pinia/configStore";

  const props = defineProps<{
    displayTopBorder: boolean;
    maxH?: number;
    maxW?: number;
  }>();

  const emit = defineEmits<{
    (e: "updatedImage", width: number, height: number): void;
  }>();

  enum CameraState {
    Ok = 0,
    Loading = 1,
    Error = 2,
  }

  const state = ref(CameraState.Loading);

  const configStore = useConfigStore();
  const { camera } = storeToRefs(configStore);

  const imageRef = ref<HTMLImageElement | null>(null);
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
