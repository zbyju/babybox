<template>
  <div id="Settings">
    <TheNav></TheNav>
    <div id="SettingsWrapper">
      <QuickActions></QuickActions>
      <SettingsForm></SettingsForm>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import router from "@/router";

  import SettingsForm from "../components/settings/form/SettingsForm.vue";
  import QuickActions from "../components/settings/QuickActions.vue";
  import TheNav from "../components/TheNav.vue";

  setTimeout(() => {
    router.push({ path: "/" });
  }, 1000 * 60 * 10);
</script>

<style lang="stylus">
  #Settings
    min-height 100vh
    width 100vw

    background-color color-bg-black
    color color-text-white
    #SettingsWrapper
      padding 1.5vw
</style>
