<template>
  <div
    id="CameraWrapper"
    :style="{ maxHeight: props.maxH, maxWidth: props.maxW }"
  >
    <div v-if="displayDoors" id="DoorBars">
      <HorizontalPositionBar
        :max-value="maxDoors"
        :min-value="minDoors"
        :value="leftDoors"
        :direction="'row'"
      />
      <HorizontalPositionBar
        :max-value="maxDoors"
        :min-value="minDoors"
        :value="rightDoors"
        :direction="'row-reverse'"
      />
    </div>
    <CameraView :display-top-border="displayDoors === false" />
  </div>
</template>

<script lang="ts" setup>
  import CameraView from "@/components/panel/elements/CameraView.vue";
  import HorizontalPositionBar from "@/components/panel/elements/HorizontalPositionBar.vue";
  import { useUnitsStore } from "@/pinia/unitsStore";
  import { storeToRefs } from "pinia";
  import { computed, ref } from "vue";

  const props = defineProps<{
    maxW?: string;
    maxH?: string;
    displayDoors: boolean;
  }>();

  const unitsStore = useUnitsStore();
  const { engineUnit } = storeToRefs(unitsStore);
  const minDoors = computed(() => parseInt(engineUnit.value[2].value));
  const maxDoors = computed(() => parseInt(engineUnit.value[3].value));
  const leftDoors = computed(() => parseInt(engineUnit.value[37].value));
  const rightDoors = computed(() => parseInt(engineUnit.value[38].value));
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
