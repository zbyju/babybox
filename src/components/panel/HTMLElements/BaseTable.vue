<template>
  <div class="Table">
    <table>
      <thead>
        <tr>
          <th colspan="6">{{ props.title }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(blockRows, i) in props.blocks" :key="i">
          <td
            v-for="(block, j) in blockRows"
            :key="j"
            class="table-block"
            :class="[block.active ? block.color : '']"
            :colspan="block.colspan"
          >
            {{
              block.active ? block.label : block.nonActiveLabel || block.label
            }}
          </td>
        </tr>
        <tr v-for="(row, index) in props.rows" :key="index">
          <td
            class="table-label"
            :class="[
              row.error ? 'color-error' : '',
              row.success ? 'color-success' : '',
              row.warning ? 'color-warning' : '',
            ]"
            colspan="3"
          >
            {{ row.label }}
          </td>
          <td class="table-value" colspan="3">
            {{ row.value || "--" }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
  import type { TableBlockData, TableData } from "@/types/panel/tables";

  const props = defineProps<{
    title: string;
    rows: TableData;
    blocks?: TableBlockData;
  }>();
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
