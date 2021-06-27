<template>
  <div :class="active ? 'active' : 'non-active'">
    <router-view></router-view>
  </div>
</template>

<script lang="ts">
import { defineComponent, onBeforeMount, computed } from "vue";
import { useStore } from "vuex";
import { initializeStore } from "@/utils/store";

export default defineComponent({
  name: "App",

  setup() {
    const active = computed(() => useStore().state.active);
    onBeforeMount(initializeStore);

    return { active };
  },
});
</script>

<style lang="stylus">
// CSS
#app
  font-family "Open Sans", Avenir, Helvetica, Arial, sans-serif
  -webkit-font-smoothing antialiased
  -moz-osx-font-smoothing grayscale
  color color

  div.non-active
    background-color background
    color color
  div.active
    animation: mymove 3s infinite;
    animation-timing-function: ease-in-out;

@keyframes mymove {
  0% {background-color: black;}
  50% {background-color: red;}
  100% {background-color: black;}
}

.time-font
  font-family Impact, Avenir, Helvetica, Arial, sans-serif
  font-weight 800

html, body
  padding 0
  margin 0
  min-width "calc(100vw - %s)" % scrollbar-width
  max-width "calc(100vw - %s)" % scrollbar-width
  width "calc(100vw - %s)" % scrollbar-width
  overflow-x hidden

::-webkit-scrollbar
  width 10px
::-webkit-scrollbar-track-piece
  background-color background
::-webkit-scrollbar-thumb
  background lighten(accent, 50%)
::-webkit-scrollbar-thumb:hover
  background accent2


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
