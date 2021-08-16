<template>
  <div id="Settings">
    <Nav></Nav>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Nav from "../components/Nav.vue";

export default defineComponent({
  name: "Settings",
  components: {
    Nav,
  },
});
</script>

<style lang="stylus"></style>
