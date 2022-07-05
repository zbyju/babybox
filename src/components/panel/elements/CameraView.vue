<template>
  <img
    :src="url"
    :style="{
      borderTopWidth: props.displayTopBorder ? undefined : '0px',
    }"
  />
</template>

<script lang="ts" setup>
  import useCamera from "@/composables/useCamera";
  import { useConfigStore } from "@/pinia/configStore";
  import { storeToRefs } from "pinia";
  import type { Ref } from "vue";

  const props = defineProps({
    displayTopBorder: Boolean,
  });
  const configStore = useConfigStore();
  const { camera } = storeToRefs(configStore);
  const url: Ref<string> = useCamera(camera.value);
</script>

<style lang="stylus">
  border-width = 5px
  img
    max-height 100%
    height 100%
    width 100%
    object-fit contain;
    overflow hidden
    border 3px solid color-border-primary
    border-radius 0 0 5px 5px
    align-self center
    min-width 160px
    min-height 90px
</style>
