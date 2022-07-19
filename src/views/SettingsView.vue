<template>
  <div id="Settings">
    <TheNav></TheNav>
    <div id="SettingsWrapper">
      <QuickActions></QuickActions>
      <SettingsForm :manager="settingsManager"></SettingsForm>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { storeToRefs } from "pinia";
  import { onBeforeMount } from "vue";

  import { SettingsManager } from "@/logic/settings/manager";
  import { useConfigStore } from "@/pinia/configStore";

  import SettingsForm from "../components/settings/form/SettingsForm.vue";
  import QuickActions from "../components/settings/QuickActions.vue";
  import TheNav from "../components/TheNav.vue";

  const configStore = useConfigStore();
  const { units } = storeToRefs(configStore);
  const settingsManager = new SettingsManager(
    units.value.engine.ip,
    units.value.thermal.ip,
  );
  onBeforeMount(() => settingsManager.loadSettings);
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
