<template>
  <div id="SettingsForm">
    <div class="settings-row">
      <Actions :manager="manager"></Actions>
      <Filters :manager="manager"></Filters>
      <Result :manager="manager"></Result>
    </div>
    <Table :manager="manager"></Table>
    <Log :manager="manager"></Log>
  </div>
</template>

<script lang="ts">
import { defineComponent, toRefs } from "vue";

import Actions from "@/components/settings/form/Actions.vue";
import Filters from "@/components/settings/form/Filters.vue";
import Log from "@/components/settings/form/Log.vue";
import Result from "@/components/settings/form/Result.vue";
import Table from "@/components/settings/form/Table.vue";

export default defineComponent({
  props: {
    manager: {
      type: Object,
      required: true,
    },
  },
  components: {
    Actions,
    Filters,
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
