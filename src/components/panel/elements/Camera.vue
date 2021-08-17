<template>
  <div id="Camera">
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
div#Camera
  margin 0 auto -7px auto
  img
    max-width 100%;
    width auto
    max-height 38vh;
    min-width 320px
    min-height 180px
    object-fit cover;

    border 5px solid primary
    margin 0 auto
    border-radius 5px
    background-color secondary
</style>
