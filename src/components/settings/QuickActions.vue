<template>
  <div id="QuickActions">
    <h2>Rychlé akce</h2>
    <div class="action-wrapper">
      <button class="card-button" @click="openBabybox">Otevřít Babybox</button>
      <button class="card-button" @click="openServiceDoors">
        Otevřít servisní dveře
      </button>
      <CameraWrapper />
    </div>
  </div>
</template>

<script lang="ts">
import { openDoors, resetBabybox } from "@/api/units";
import { Config } from "@/types/panel/main";
import { computed, defineComponent } from "vue";
import { useStore } from "vuex";
import CameraWrapper from "../panel/containers/CameraWrapper.vue";

export default defineComponent({
  setup() {
    const store = useStore();
    const config = computed((): Config => store.state.config);
    const openBabybox = async () => {
      try {
        await openDoors(config.value.units.engine.ip);
      } catch (err) {
        console.log(err);
      }
    };
    const openServiceDoors = async () => {
      try {
        await resetBabybox(config.value.units.engine.ip);
      } catch (err) {
        console.log(err);
      }
    };
    return { openBabybox, openServiceDoors };
  },
  components: { CameraWrapper },
});
</script>

<style lang="stylus">
.card-button
  padding 10px
  min-width 230px
  min-height 100px
  background-color app-bg-primary
  border 1px solid app-border-secondary
  border-radius 20px
  margin-right 30px
  font-size 1.1em
  font-weight 100
.card-button:hover
  background-color app-bg-primary-hover

#QuickActions
  h2
    margin 0 0 10px 0
  .action-wrapper
    display: flex
    flex-direction: row
    justify-content: flex-start
    margin-bottom 15px
</style>
