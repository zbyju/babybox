<template>
  <div id="CameraWrapper">
    <img :src="url" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useStore } from "vuex";
import useCamera from "@/composables/useCamera";

export default defineComponent({
  setup() {
    const store = useStore();
    const config = store.state.config.camera;
    const url = useCamera(config);

    return { url };
  },
});
</script>

<style lang="stylus">
#CameraWrapper
  grid-area camera
  max-width 100%
  min-width 300px
  overflow hidden

  display flex
  flex-direction row
  justify-content center
  align-items center

  background-color primary
  border 3px solid secondary

  img
    width 100%
    margin auto
    padding 5px
</style>
