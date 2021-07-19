<template>
  <div id="TableTemperature">
    <div class="Table">
      <table>
        <thead>
          <tr>
            <th colspan="6">{{ title }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="table-label active" colspan="2">Topí plášť</td>
            <td class="table-label border-cell active" colspan="2">
              Topí vzduch
            </td>
            <td class="table-label active" colspan="2">Chladí vzduch</td>
          </tr>
          <tr v-for="(row, index) in rows" :key="index">
            <td class="table-label" colspan="3">{{ row.label }}</td>
            <td class="table-value" colspan="3">{{ row.value || "--" }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import { getRowsTableTemperatures } from "@/utils/tables";
import { defineComponent, computed } from "vue";
import { useStore } from "vuex";

export default defineComponent({
  setup() {
    const store = useStore();
    const rows = computed(() => {
      return getRowsTableTemperatures(
        store.state.engineUnit,
        store.state.thermalUnit
      );
    });
    return {
      title: "Topení/chlazení",
      rows,
    };
  },
});
</script>

<style lang="stylus">
#TableTemperature
  grid-area table-temperature

  flex-grow 10
  align-self flex-end

  .border-cell
    border-right 1px solid primary
    border-left 1px solid primary

  .active
    background text-success
</style>
