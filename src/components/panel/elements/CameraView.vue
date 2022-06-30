<template>
  <img
    :src="url"
    :style="{ borderTopWidth: displayTopBorder ? undefined : '0px' }"
  />
</template>

<script lang="ts">
import useCamera from "@/composables/useCamera";
import { useConfigStore } from "@/pinia/configStore";
import { storeToRefs } from "pinia";
import { defineComponent } from "vue";
import type { Ref } from "vue";

export default defineComponent({
  props: {
    displayTopBorder: Boolean,
  },
  setup() {
    const configStore = useConfigStore();
    const { camera } = storeToRefs(configStore);
    const url: Ref<string> = useCamera(camera.value);

    return { url };
  },
});
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
