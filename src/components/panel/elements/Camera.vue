<template>
  <img :src="url" />
</template>

<script lang="ts">
import { defineComponent, Ref } from "vue";
import { useStore } from "vuex";
import useCamera from "@/composables/useCamera";

export default defineComponent({
  setup() {
    const store = useStore();
    const config = store.state.config.camera;
    const url: Ref<string> = useCamera(config);

    return { url };
  },
});
</script>

<style lang="stylus">
border-width = 5px
img
  max-height 100%
  width auto
  object-fit scale-down;
  overflow hidden
  border 3px solid primary
  border-top 0
  border-radius 0 0 5px 5px
</style>
