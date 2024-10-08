<template>
  <div
    id="CameraWrapper"
    :style="{ maxHeight: props.maxH + 'px', maxWidth: props.maxW + 'px' }"
  >
    <div v-if="displayDoors === true" id="DoorBars">
      <HorizontalPositionBar
        :max-value="maxDoors!"
        :min-value="minDoors!"
        :value="leftDoors!"
        :direction="'row'"
      />
      <HorizontalPositionBar
        :max-value="maxDoors!"
        :min-value="minDoors!"
        :value="rightDoors!"
        :direction="'row-reverse'"
      />
    </div>
    <CameraView
      :display-top-border="displayDoors === false"
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
  const minDoors = computed(
    () => engineUnit.value?.settings.engine.closedThreshold,
  );
  const maxDoors = computed(
    () => engineUnit.value?.settings.engine.openedThreshold,
  );
  const leftDoors = computed(() => engineUnit.value?.data.engine.left.position);
  const rightDoors = computed(
    () => engineUnit.value?.data.engine.right.position,
  );

  const displayDoors = computed(() => {
    if (props.displayDoors === false) return false;
    if (
      minDoors.value === undefined ||
      maxDoors.value === undefined ||
      leftDoors.value === undefined ||
      rightDoors.value === undefined
    ) {
      return false;
    }
    return true;
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
