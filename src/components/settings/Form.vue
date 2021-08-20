<template>
  <div id="SettingsForm">
    <Header></Header>
    <Actions :manager="manager"></Actions>
    <Result :manager="manager"></Result>
    <Table :manager="manager"></Table>
    <Log :manager="manager"></Log>
  </div>
</template>

<script lang="ts">
import { defineComponent, toRefs } from "vue";

import Actions from "@/components/settings/Actions.vue";
import Header from "@/components/settings/Header.vue";
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
    Header,
    Log,
    Result,
    Table,
  },
});
</script>

<style lang="stylus"></style>
