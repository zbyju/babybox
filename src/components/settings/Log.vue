<template>
  <div id="SettingsLogsHeader">
    <h2>Log</h2>
    <button class="btn-error btn-small" @click="manager.deleteLog">
      Smazat log
    </button>
  </div>
  <div id="SettingsLog">
    <div
      class="log-message"
      v-for="(msg, index) in manager.log.value"
      :key="index"
    >
      {{ msg }}
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from "vue";

export default defineComponent({
  props: {
    manager: {
      type: Object,
      required: true,
    },
  },
  setup(props) {},
});
</script>

<style lang="stylus">
#SettingsLog
  background-color accent
  min-height 150px
  max-height 500px
  overflow-y scroll
  width 100%
  border 1px solid app-primary
  border-radius 8px
  margin-top 12px
  .log-message
    border-bottom 1px solid primary
    border-radius 8px
    padding 5px 10px 4px 10px
    transition all 0.5s
  .log-message:hover
    background-color accent-hover
#SettingsLogsHeader
  display flex
  flex-direction row
  flex-wrap wrap
  align-items center
  gap 20px
  margin-top 20px
  h2
    margin 0
</style>
