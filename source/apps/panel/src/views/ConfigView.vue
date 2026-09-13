<template>
  <div id="Config">
    <TheNav></TheNav>
    <div id="ConfigWrapper">
      <ConfigForm></ConfigForm>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import router from "@/router";

  import ConfigForm from "../components/config/ConfigForm.vue";
  import TheNav from "../components/TheNav.vue";

  /* Back to the panel, so an unattended box never sits on the config page. */
  setTimeout(() => {
    router.push({ path: "/" });
  }, 1000 * 60 * 10);
</script>

<style lang="stylus">
  #Config
    min-height 100vh
    width 100vw

    background-color color-bg-black
    color color-text-white
    #ConfigWrapper
      padding 1.5vw
</style>
