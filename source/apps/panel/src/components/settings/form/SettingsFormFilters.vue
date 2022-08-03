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
  const emit = defineEmits<{
    (e: "filterChange", filter: "no" | "engine" | "thermal"): void;
  }>();

  const selected = ref("no");
  const filterChange = (event: Event) => {
    if ((event.target as HTMLInputElement).value === "no")
      emit("filterChange", "no");
    if ((event.target as HTMLInputElement).value === "engine")
      emit("filterChange", "engine");
    if ((event.target as HTMLInputElement).value === "thermal")
      emit("filterChange", "thermal");
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
