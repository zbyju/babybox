<template>
  <img :src="url" />
</template>

<script lang="ts">
import useCamera from "@/composables/useCamera";
import { useConfigStore } from "@/pinia/configStore";
import { storeToRefs } from "pinia";
import { defineComponent } from "vue";
import type { Ref } from "vue";

export default defineComponent({
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
  width auto
  object-fit fill;
  overflow hidden
  border 3px solid app-border-primary
  border-top 0
  border-radius 0 0 5px 5px
  min-width 160px
  min-height 90px
</style>
