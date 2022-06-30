<template>
  <div id="Data">
    <TheNav></TheNav>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import TheNav from "../components/TheNav.vue";

export default defineComponent({
  name: "Data",
  components: {
    TheNav,
  },
});
</script>

<style lang="stylus"></style>
