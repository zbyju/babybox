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
div#Camera
  height 100%
  display inline-block
  background red
img
  max-width 100%
  max-height 98%
  height 98%
  object-fit contain;
  border 3px solid primary
  border-top 0
  border-radius 0 0 5px 5px
</style>
