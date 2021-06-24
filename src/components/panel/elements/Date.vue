<template>
  <div id="Date">
    <span id="Date">{{ date }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from "vue";
import { useStore } from "vuex";
import { getFullDate } from "@/utils/time";

export default defineComponent({
  setup() {
    const store = useStore();
    const date = computed((): string => getFullDate(store.state.timePC));
    return { date };
  },
});
</script>

<style lang="stylus"></style>
