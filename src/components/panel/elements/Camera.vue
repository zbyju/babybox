<template>
  <div id="CameraWrapper">
    <img :src="url" />
  </div>
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
div#CameraWrapper
  padding 0 10px
  grid-area camera
  img
    max-width 100%;
    max-height "calc(100% - %s * 2)" % border-width;
    min-width 100px
    min-height 100px
    object-fit cover;

    margin 0 auto
    border 5px solid primary
    border-radius 5px
    background-color secondary
    align-self flex-end
</style>
