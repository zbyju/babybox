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

<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
  props: {
    manager: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const selected = ref("no");
    const filterChange = (event) => {
      if (event.target.value === "no") props.manager.removeFilterRows();
      if (event.target.value === "engine") props.manager.filterEngineRows();
      if (event.target.value === "thermal") props.manager.filterThermalRows();
    };
    return { selected, filterChange };
  },
});
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
      border 1px solid #2d2b52
      border-radius 10px
      padding 5px
      background-color #000
      color #fff
</style>
