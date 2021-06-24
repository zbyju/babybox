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
  overflow hidden

  display flex
  flex-direction row
  justify-content center
  align-items center

  background-color primary

  img
    border-width = 3px
    width "calc(100% - (%s * 2))" % border-width
    margin auto
    border border-width solid secondary
    padding 5px
</style>
