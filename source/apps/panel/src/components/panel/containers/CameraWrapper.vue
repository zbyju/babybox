<template>
  <div class="camera-wrapper">
    <div
      v-if="showDoorBars"
      class="camera-door-bars"
      role="group"
      :aria-label="doors ? 'Poloha dveří' : 'Poloha dveří není k dispozici'"
    >
      <template v-if="doors">
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
      </template>
    </div>
    <div class="camera-frame">
      <CameraView :display-top-border="!showDoorBars" />
      <slot name="overlay" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { storeToRefs } from "pinia";
  import { computed } from "vue";

  import CameraView from "@/components/panel/elements/CameraView.vue";
  import HorizontalPositionBar from "@/components/panel/elements/HorizontalPositionBar.vue";
  import { useUnitsStore } from "@/pinia/unitsStore";

  const props = defineProps<{
    displayDoors: boolean;
    showEmptyDoors?: boolean;
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
  const showDoorBars = computed(
    () => !!doors.value || (props.displayDoors && props.showEmptyDoors),
  );
</script>

<style lang="stylus">
  .camera-wrapper
    max-width 35%
    height 100%

    > .camera-frame
      position relative
      height 100%

    .camera-door-bars
      width calc(100% + 5px)
      max-height 100%
      display flex
      flex-direction row
      justify-content space-between
      gap 5px
</style>
