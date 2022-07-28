<template>
  <div class="verticalPositionBar" :style="{ flexDirection: props.direction }">
    <div class="fill" :style="{ width: width + '%' }"></div>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from "vue";

  const props = defineProps<{
    maxValue: number;
    minValue: number;
    value: number;
    direction: "row" | "row-reverse";
  }>();

  const width = computed(() => {
    if (
      typeof props.maxValue === "number" &&
      typeof props.minValue === "number" &&
      typeof props.value === "number"
    ) {
      return Math.min(
        100 - ((props.value - props.minValue) * 100) / props.maxValue,
        100,
      );
    } else {
      return 0;
    }
  });
</script>

<style lang="stylus">
  div.verticalPositionBar
    display flex
    flex-direction row
    height 4px
    flex-grow 1

    div.fill
      align-self flex-end
      height 100%
      width 0
      border-radius 5px 5px 0 0
      background-color color-text-success
      transition 0.5s all
</style>
