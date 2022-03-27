<template>
  <div id="Settings">
    <Nav></Nav>
    <div id="SettingsWrapper">
      <QuickActions></QuickActions>
      <SettingsForm :manager="settingsManager"></SettingsForm>
    </div>
  </div>
</template>

<script lang="ts">
import { Config } from "@/types/panel/main";
import { SettingsManager } from "@/utils/settings/settings";
import { computed, ComputedRef, defineComponent, onBeforeMount } from "vue";
import { useStore } from "vuex";
import Nav from "../components/Nav.vue";
import SettingsForm from "../components/settings/form/Form.vue";
import QuickActions from "../components/settings/QuickActions.vue";

export default defineComponent({
  name: "Settings",
  components: {
    Nav,
    SettingsForm,
    QuickActions,
  },
  setup() {
    const store = useStore();
    const config: ComputedRef<Config> = computed(() => store.state.config);
    const settingsManager = new SettingsManager(
      config.value.units.engine.ip,
      config.value.units.thermal.ip
    );
    onBeforeMount(() => settingsManager.loadSettings);
    return { settingsManager };
  },
});
</script>

<style lang="stylus">
#Settings
  min-height 100vh
  width 100vw

  background-color app-background
  color app-color
  color color
  #SettingsWrapper
    padding 1.5vw
</style>
