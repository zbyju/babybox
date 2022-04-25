<template>
  <div v-if="initialised">
    <router-view></router-view>
  </div>
  <div v-else>Chybí config soubor</div>
</template>

<script lang="ts">
import { defineComponent, onBeforeMount } from "vue";
import { AppManager } from "@/utils/store";
import { useConfigStore } from "./pinia/configStore";
import { storeToRefs } from "pinia";

export default defineComponent({
  name: "App",
  setup() {
    const configStore = useConfigStore();
    const appManager = new AppManager();
    const { initialised } = storeToRefs(configStore);
    onBeforeMount(async () => await appManager.initializeGlobal());
    return { initialised };
  },
});
</script>

<style lang="stylus">
// CSS
#app, button, input, select
  font-family "Open Sans", Avenir, Helvetica, Arial, sans-serif
  -webkit-font-smoothing antialiased
  -moz-osx-font-smoothing grayscale

.time-font
  font-family Impact, Avenir, Helvetica, Arial, sans-serif
  font-weight 800

html, body
  padding 0
  margin 0
  min-width 100vw
  max-width 100vw
  width 100vw
  overflow-x hidden
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;


.w-300
  font-weight 300

.w-400
  font-weight 400

.w-600
  font-weight 600

.w-700
  font-weight 700

.w-800
  font-weight 800

.fs-italic
  font-style italic

.fs-normal
  font-style normal
</style>
