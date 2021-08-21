<template>
  <div id="TableTemperature">
    <div class="Table">
      <table>
        <thead>
          <tr>
            <th colspan="6" :style="headSize">{{ title }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              class="table-label"
              :class="{ active: heatingCase }"
              :style="labelSize"
              colspan="2"
            >
              Topí plášť
            </td>
            <td
              class="table-label border-cell"
              :class="{ active: heatingAir }"
              :style="labelSize"
              colspan="2"
            >
              Topí vzduch
            </td>
            <td
              class="table-label"
              :class="{ active: cooling }"
              :style="labelSize"
              colspan="2"
            >
              Chladí vzduch
            </td>
          </tr>
          <tr v-for="(row, index) in rows" :key="index">
            <td class="table-label" :style="labelSize" colspan="3">
              {{ row.label }}
            </td>
            <td class="table-value" :style="valueSize" colspan="3">
              {{ row.value || "--" }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import { getRowsTableTemperatures } from "@/utils/panel/tables";
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

    const heatingCase = computed(
      () => store.state.thermalUnit[24].value === "255"
    );
    const heatingAir = computed(
      () => store.state.thermalUnit[25].value === "255"
    );
    const cooling = computed(() => store.state.thermalUnit[26].value === "255");

    const headSize = {
      fontSize: store.state.config.fontSizes.tableHeading + "vw",
    };
    const labelSize = {
      fontSize: store.state.config.fontSizes.tableLabel + "vw",
    };
    const valueSize = {
      fontSize: store.state.config.fontSizes.tableValue + "vw",
    };
    return {
      title: "Topení/chlazení",
      rows,
      headSize,
      labelSize,
      valueSize,
      heatingCase,
      heatingAir,
      cooling,
    };
  },
});
</script>

<style lang="stylus">
#TableTemperature
  grid-area table-temperature

  .border-cell
    border-right 1px solid primary
    border-left 1px solid primary

  .active
    background success
</style>
