<template>
  <div id="Filters">
    <h2>Filtry</h2>
    <div class="filter-wrapper">
      <select v-model="selected" @change="filterChange">
        <option value="no">Všechny parametry</option>
        <option value="engine">Jednotka motory</option>
        <option value="thermal">Jednotka topení</option>
      </select>
    </div>
  </div>
</template>

<script lang="ts" setup>
  import { ref } from "vue";

  import type { SettingsManager } from "@/logic/settings/manager";

  const props = defineProps<{
    manager: SettingsManager;
  }>();

  const selected = ref("no");
  const filterChange = (event: Event) => {
    if ((event.target as HTMLInputElement).value === "no")
      props.manager.removeFilterRows();
    if ((event.target as HTMLInputElement).value === "engine")
      props.manager.filterEngineRows();
    if ((event.target as HTMLInputElement).value === "thermal")
      props.manager.filterThermalRows();
  };
</script>

<style lang="stylus">
  #Filters
    display flex
    flex-direction column
    div.filter-wrapper
      display flex
      height auto
      flex-grow 1

      select
        height 95%
        border 1px solid color-border-secondary
        border-radius 10px
        padding 5px
        background-color color-bg-black
        color #fff
</style>
