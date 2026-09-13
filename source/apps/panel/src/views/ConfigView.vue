<template>
  <div id="Config">
    <TheNav></TheNav>
    <div id="ConfigWrapper">
      <p v-if="banner !== null" id="RestartBanner">
        <span>{{ banner }}</span>
        <button @click="onDismiss">Skrýt</button>
      </p>
      <ConfigForm></ConfigForm>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { type Ref, ref } from "vue";

  import { clearBanner, readBanner } from "@/logic/config/restartBanner";
  import router from "@/router";

  import ConfigForm from "../components/config/ConfigForm.vue";
  import TheNav from "../components/TheNav.vue";

  /*
   * A save ends in window.location.reload(), so the last save's warning cannot be
   * component state. It sits in sessionStorage and this is the page that reads it.
   */
  const banner: Ref<string | null> = ref(readBanner());

  function onDismiss() {
    clearBanner();
    banner.value = null;
  }

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

      #RestartBanner
        display flex
        flex-direction row
        align-items center
        justify-content space-between
        gap 16px
        margin 0 0 20px 0
        padding 12px 16px
        border-radius 8px
        background-color color-warning
        color color-bg-black
        font-weight 700

        button
          padding 8px 12px
          border 0
          border-radius 8px
          background-color color-bg-black
          color color-text-white
          font-weight 700
          font-size 0.9em
        button:hover
          cursor pointer
</style>
