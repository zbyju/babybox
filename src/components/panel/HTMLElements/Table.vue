<template>
  <div class="Table">
    <table>
      <thead>
        <tr>
          <th colspan="6" :style="headSize">{{ title }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(blockRows, index) in blocks" :key="index">
          <td
            v-for="(block, index) in blockRows"
            :key="index"
            class="table-block"
            :class="[block.active ? block.color : '']"
            :style="{ labelSize }"
            :colspan="block.colspan"
          >
            {{
              block.active ? block.label : block.nonActiveLabel || block.label
            }}
          </td>
        </tr>
        <tr v-for="(row, index) in rows" :key="index">
          <td
            class="table-label"
            :class="[
              row.error ? 'error' : '',
              row.success ? 'success' : '',
              row.warning ? 'warning' : '',
            ]"
            :style="labelSize"
            colspan="3"
          >
            {{ row.label }}
          </td>
          <td class="table-value" :style="valueSize" colspan="3">
            {{ row.value || "--" }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { useConfigStore } from "@/pinia/configStore";
import { TableBlockData, TableData } from "@/types/panel/tables";
import { storeToRefs } from "pinia";
import { defineComponent, PropType, toRef } from "vue";
import { useStore } from "vuex";

export default defineComponent({
  props: {
    titleProp: String,
    rowsProp: Array as PropType<TableData>,
    blocksProp: Array as PropType<TableBlockData>,
  },
  setup(props) {
    const configStore = useConfigStore();
    const { fontSize } = storeToRefs(configStore);
    // TODO: Refactor getting props
    const title = toRef(props, "titleProp");
    const rows = toRef(props, "rowsProp");
    const blocks = toRef(props, "blocksProp");
    const headSize = {
      fontSize: fontSize.value.tableHeading + "vw",
    };
    const labelSize = {
      fontSize: fontSize.value.tableLabel + "vw",
    };
    const valueSize = {
      fontSize: fontSize.value.tableValue + "vw",
    };
    return { title, rows, headSize, labelSize, valueSize, blocks };
  },
});
</script>

<style lang="stylus">
.Table
  display: flex

  table
    border-collapse collapse
    overflow hidden
    margin auto
    font-size 0.75vw
    align-self center
    white-space nowrap
    border-radius 10px


    thead
      border-bottom 1px solid app-border-secondary
      border-radius 10px
      tr
        background app-bg-secondary-gradient
        color text-secondary
        font-size 16px
        border-radius 10px

    th, td
      padding 10px 10px

    tr
      background-color app-bg-primary
      border-bottom 1px solid app-border-primary
    tr:nth-of-type(even)
      background-color app-bg-primary-light
    td.table-label
      font-weight 700
      font-size 14px
      color text-secondary
      text-align left
    td.table-block
      font-weight 700
      font-size 14px
      color text-secondary
      text-align center
      padding 7px
    td.table-value
      text-align right
</style>
