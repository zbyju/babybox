<template>
  <VivotekCameraView v-if="cameraType === CameraType.vivotek" v-bind="props" />
  <SnapshotCameraView v-else v-bind="props" />
</template>

<script lang="ts" setup>
  import { storeToRefs } from "pinia";

  import { useConfigStore } from "@/pinia/configStore";
  import { CameraType } from "@/types/panel/config.types";
  import { stringToCameraType } from "@/utils/panel/camera";

  import SnapshotCameraView from "./SnapshotCameraView.vue";
  import VivotekCameraView from "./VivotekCameraView.vue";

  const props = defineProps<{
    displayTopBorder: boolean;
    maxH?: number;
    maxW?: number;
  }>();

  const configStore = useConfigStore();
  const { camera } = storeToRefs(configStore);

  // Vivotek renders its own iframe, so it needs no snapshot polling.
  const cameraType = stringToCameraType(camera.value.cameraType);
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
