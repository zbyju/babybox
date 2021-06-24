<template>
  <div id="Time">
    <span id="Time">{{ time }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { useStore } from "vuex";
import { getFullTime } from "@/utils/time";

export default defineComponent({
  setup() {
    const store = useStore();
    const time = computed((): string => getFullTime(store.state.timePC));
    return { time };
  },
});
</script>

<style lang="stylus"></style>
