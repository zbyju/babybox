<template>
  <img :src="url" />
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
border-width = 5px
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
