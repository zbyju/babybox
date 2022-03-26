<template>
  <div id="CameraWrapper">
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
import { computed, defineComponent } from "vue";
import { useStore } from "vuex";
import Camera from "@/components/panel/elements/Camera.vue";
import HorizontalPositionBar from "@/components/panel/elements/HorizontalPositionBar.vue";

export default defineComponent({
  setup() {
    const store = useStore();
    const minDoors = computed(() => parseInt(store.state.engineUnit[2].value));
    const maxDoors = computed(() => parseInt(store.state.engineUnit[3].value));
    const leftDoors = computed(() =>
      parseInt(store.state.engineUnit[37].value)
    );
    const rightDoors = computed(() =>
      parseInt(store.state.engineUnit[38].value)
    );
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
