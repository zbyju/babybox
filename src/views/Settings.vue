<template>
  <div id="Settings">
    <Nav></Nav>
    <div id="SettingsWrapper">
      <SettingsForm></SettingsForm>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Nav from "../components/Nav.vue";
import SettingsForm from "../components/settings/Form.vue";

export default defineComponent({
  name: "Settings",
  components: {
    Nav,
    SettingsForm,
  },
});
</script>

<style lang="stylus">
#Settings
  min-height 100vh
  height 100vh
  width 100vw

  background-color app-background
  color app-color
  color color
  #SettingsWrapper
    padding 1.5vw
</style>
