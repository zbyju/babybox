<template>
  <div class="verticalPositionBar" :style="{ flexDirection }">
    <div class="fill" :style="{ width: width + '%' }"></div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, toRefs } from "vue";

export default defineComponent({
  props: {
    maxValue: {
      type: Number,
      required: true,
    },
    minValue: {
      type: Number,
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    direction: {
      type: String,
      required: true,
    },
  },

  setup(props) {
    const { maxValue, minValue, value, direction } = toRefs(props);

    const width = computed(() => {
      if (
        typeof maxValue.value === "number" &&
        typeof minValue.value === "number" &&
        typeof value.value === "number"
      ) {
        return Math.min(
          100 - ((value.value - minValue.value) * 100) / maxValue.value,
          100
        );
      } else {
        return 0;
      }
    });
    return { width, flexDirection: direction };
  },
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
