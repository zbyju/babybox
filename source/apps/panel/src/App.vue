<template>
  <AppState>
    <router-view></router-view>
  </AppState>
</template>

<script lang="ts" setup>
  import { onBeforeMount } from "vue";

  import { AppManager } from "@/logic/panel/panelLoop";

  import { refreshRestartCooldown } from "./api/restart";
  import AppState from "./components/AppState.vue";

  const appManager = new AppManager();
  onBeforeMount(async () => await appManager.initializeGlobal());

  setInterval(async () => {
    await refreshRestartCooldown();
  }, 5000);
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
