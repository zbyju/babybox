<template>
  <div id="CameraWrapper" :style="maxW ? { maxWidth: maxW } : null">
    <div id="DoorBars">
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
    <Camera></Camera>
  </div>
</template>

<script lang="ts">
import Camera from "@/components/panel/elements/Camera.vue";
import HorizontalPositionBar from "@/components/panel/elements/HorizontalPositionBar.vue";
import { useUnitsStore } from "@/pinia/unitsStore";
import { storeToRefs } from "pinia";
import { computed, defineComponent } from "vue";

export default defineComponent({
  props: {
    maxW: String,
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
    Camera,
    HorizontalPositionBar,
  },
});
</script>

<style lang="stylus">
#CameraWrapper
  display flex
  flex-direction column
  height 100%
  aspect-ratio: 16/9

  #DoorBars
    width 100%
    max-height 100%
    display flex
    flex-direction row
    justify-content space-between
    gap 5px
</style>
