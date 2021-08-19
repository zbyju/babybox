<template>
  <div id="SettingsForm">
    <Header></Header>
    <Actions></Actions>
    <Result></Result>
    <Table></Table>
    <Log></Log>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import Actions from "@/components/settings/Actions.vue";
import Header from "@/components/settings/Header.vue";
import Log from "@/components/settings/Log.vue";
import Result from "@/components/settings/Result.vue";
import Table from "@/components/settings/Table.vue";

export default defineComponent({
  components: {
    Actions,
    Header,
    Log,
    Result,
    Table,
  },
  setup() {},
});
</script>

<style lang="stylus"></style>
