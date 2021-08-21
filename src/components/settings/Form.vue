<template>
  <div id="SettingsForm">
    <div class="settings-row">
      <Actions :manager="manager"></Actions>
      <Result :manager="manager"></Result>
    </div>
    <Table :manager="manager"></Table>
    <Log :manager="manager"></Log>
  </div>
</template>

<script lang="ts">
import { defineComponent, toRefs } from "vue";

import Actions from "@/components/settings/Actions.vue";
import Log from "@/components/settings/Log.vue";
import Result from "@/components/settings/Result.vue";
import Table from "@/components/settings/Table.vue";

export default defineComponent({
  props: {
    manager: {
      type: Object,
      required: true,
    },
  },
  components: {
    Actions,
    Log,
    Result,
    Table,
  },
});
</script>

<style lang="stylus">
#SettingsForm
  .settings-row
    display flex
    flex-direction row
    justify-content flex-start
    margin-bottom 20px
    gap 30px
    flex-wrap wrap
  h2
    margin-top 0
</style>
