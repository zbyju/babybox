<template>
  <div id="CameraWrapper" :style="{ maxHeight: maxH, maxWidth: maxW }">
    <div id="DoorBars" v-if="displayDoors">
      <HorizontalPositionBar
        :maxValue="maxDoors"
        :minValue="minDoors"
        :value="leftDoors"
        :direction="'row'"
      ></HorizontalPositionBar>
      <HorizontalPositionBar
        :maxValue="maxDoors"
        :minValue="minDoors"
        :value="rightDoors"
        :direction="'row-reverse'"
      ></HorizontalPositionBar>
    </div>
    <CameraView :displayTopBorder="displayDoors === false"></CameraView>
  </div>
</template>

<script lang="ts">
import CameraView from "@/components/panel/elements/CameraView.vue";
import HorizontalPositionBar from "@/components/panel/elements/HorizontalPositionBar.vue";
import { useUnitsStore } from "@/pinia/unitsStore";
import { storeToRefs } from "pinia";
import { computed, defineComponent } from "vue";

export default defineComponent({
  props: {
    maxW: String,
    maxH: String,
    displayDoors: Boolean,
  },
  setup() {
    const unitsStore = useUnitsStore();
    const { engineUnit } = storeToRefs(unitsStore);
    const minDoors = computed(() => parseInt(engineUnit.value[2].value));
    const maxDoors = computed(() => parseInt(engineUnit.value[3].value));
    const leftDoors = computed(() => parseInt(engineUnit.value[37].value));
    const rightDoors = computed(() => parseInt(engineUnit.value[38].value));
    return { minDoors, maxDoors, leftDoors, rightDoors };
  },
  components: {
    CameraView,
    HorizontalPositionBar,
  },
});
</script>

<style lang="stylus">
#CameraWrapper
  aspect-ratio: 16/9
  flex-grow 1
  max-height 100%

  #DoorBars
    width 100%
    max-height 100%
    display flex
    flex-direction row
    justify-content space-between
    gap 5px
</style>
