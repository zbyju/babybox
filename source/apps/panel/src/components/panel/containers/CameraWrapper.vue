<template>
  <div
    id="CameraWrapper"
    :style="{ maxHeight: props.maxH + 'px', maxWidth: props.maxW + 'px' }"
  >
    <div v-if="doors !== undefined" id="DoorBars">
      <HorizontalPositionBar
        :max-value="doors.max"
        :min-value="doors.min"
        :value="doors.left"
        :direction="'row'"
      />
      <HorizontalPositionBar
        :max-value="doors.max"
        :min-value="doors.min"
        :value="doors.right"
        :direction="'row-reverse'"
      />
    </div>
    <CameraView
      :display-top-border="doors === undefined"
      :max-w="props.maxW ? props.maxW - 6 : undefined"
      :max-h="props.maxH ? props.maxH - 6 : undefined"
    />
  </div>
</template>

<script lang="ts" setup>
  import { storeToRefs } from "pinia";
  import { computed } from "vue";

  import CameraView from "@/components/panel/elements/CameraView.vue";
  import HorizontalPositionBar from "@/components/panel/elements/HorizontalPositionBar.vue";
  import { useUnitsStore } from "@/pinia/unitsStore";

  const props = defineProps<{
    maxW?: number;
    maxH?: number;
    displayDoors: boolean;
  }>();

  const unitsStore = useUnitsStore();
  const { engineUnit } = storeToRefs(unitsStore);
  const doors = computed(() => {
    if (props.displayDoors === false) return undefined;
    const min = engineUnit.value?.settings.engine.closedThreshold;
    const max = engineUnit.value?.settings.engine.openedThreshold;
    const left = engineUnit.value?.data.engine.left.position;
    const right = engineUnit.value?.data.engine.right.position;
    if (
      min === undefined ||
      max === undefined ||
      left === undefined ||
      right === undefined
    ) {
      return undefined;
    }
    return { min, max, left, right };
  });
</script>

<style lang="stylus">
  #CameraWrapper
    max-width 35%
    height 100%

    #DoorBars
      width calc(100% + 5px)
      max-height 100%
      display flex
      flex-direction row
      justify-content space-between
      gap 5px
</style>
