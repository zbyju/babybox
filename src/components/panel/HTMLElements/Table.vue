<template>
  <div class="Table">
    <table>
      <thead>
        <tr>
          <th colspan="2" :style="headSize">{{ title }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, index) in rows" :key="index">
          <td class="table-label" :style="labelSize">{{ row.label }}</td>
          <td class="table-value" :style="valueSize">
            {{ row.value || "--" }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { TableData } from "@/types/tables";
import { defineComponent, PropType, toRef } from "vue";
import { useStore } from "vuex";

export default defineComponent({
  props: {
    titleProp: String,
    rowsProp: Array as PropType<TableData>,
  },
  setup(props) {
    const store = useStore();
    const title = toRef(props, "titleProp");
    const rows = toRef(props, "rowsProp");
    const headSize = {
      fontSize: store.state.config.fontSizes.tableHeading + "vw",
    };
    const labelSize = {
      fontSize: store.state.config.fontSizes.tableLabel + "vw",
    };
    const valueSize = {
      fontSize: store.state.config.fontSizes.tableValue + "vw",
    };
    return { title, rows, headSize, labelSize, valueSize };
  },
});
</script>

<style lang="stylus">
.Table
  display: flex

  table
    border-collapse collapse
    border 1px solid primary
    margin auto
    font-size 0.75vw
    align-self center
    white-space nowrap

    thead tr
      background-color primary
      color text-secondary
      font-size 16px

    th, td
      padding 10px 10px

    tr
      background-color primary-black
      border-bottom 1px solid third
    tr:nth-of-type(even)
      background-color primary-black-lighten
    tr:last-child
      border-bottom: none;
    td.table-label
      font-weight 700
      font-size 14px
      color text-secondary
      text-align left
    td.table-value
      text-align right
</style>
