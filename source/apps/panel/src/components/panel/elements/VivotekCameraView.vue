<template>
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
  border-width = 5px
  img
    max-height 100%
    height 100%
    width calc(100% - 4px)
    object-fit contain;
    overflow hidden
    border 3px solid color-border-primary
    border-radius 0 0 5px 5px
    align-self center
    min-width 160px
    min-height 90px

  .camera-error
    max-height 100%
    width 100%
    overflow hidden
    border 3px solid color-border-error
    border-radius 0 0 5px 5px
    align-self center
    text-align center
    min-width 160px
    min-height 90px

    h4
      color color-text-error

  .camera-loading
    max-height 100%
    width 100%
    overflow hidden
    border 3px solid color-border-primary
    border-radius 0 0 5px 5px
    align-self center
    text-align center
    min-width 160px
    min-height 90px
</style>
