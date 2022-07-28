<template>
  <div class="Table">
    <table>
      <thead>
        <tr>
          <th colspan="6">{{ props.title }}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <DataTableBlock
            v-for="(block, i) in data.blocks"
            :key="i"
            :block="block"
          />
        </tr>
        <tr v-for="(row, i) in data.rows" :key="i">
          <DataTableRow :row="row" />
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from "vue";

  import type {
    TableBlockTemplate,
    TableData,
    TableRowTemplate,
    TableValues,
  } from "@/types/panel/tables.types";
  import { combineTableData } from "@/utils/panel/combineTableData";

  import DataTableBlock from "./DataTableBlock.vue";
  import DataTableRow from "./DataTableRow.vue";

  const props = defineProps<{
    title: string;
    rows: TableRowTemplate[];
    blocks: TableBlockTemplate[];
    values: TableValues;
  }>();

  const data = computed<TableData>(() =>
    combineTableData(props.rows, props.blocks, props.values),
  );
</script>

<style lang="stylus">
  .Table
    display: flex

    table
      border-collapse collapse
      overflow hidden
      margin auto
      font-size font-size-tableLabel vw
      align-self center
      white-space nowrap
      border-radius 10px


      thead
        border-bottom 1px solid color-border-secondary
        border-radius 10px
        tr
          background color-bg-secondary-gradient
          color color-text-secondary
          font-size font-size-tableHeading vw
          border-radius 10px

      th, td
        padding 10px 10px

      tr
        background-color color-bg-primary
        border-bottom 1px solid color-border-primary
      tr:nth-of-type(even)
        background-color color-bg-primary-light
      td.table-label
        font-weight 700
        font-size font-size-tableLabel vw
        color color-text-secondary
        text-align left
      td.table-block
        font-weight 700
        font-size font-size-tableLabel vw
        color color-text-secondary
        text-align center
        padding 7px
      td.table-value
        text-align right
        font-size font-size-tableValue vw
</style>
