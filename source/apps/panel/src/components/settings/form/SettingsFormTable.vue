<template>
  <div id="SettingsTable">
    <table>
      <thead>
        <tr>
          <th v-for="header in headers" :key="header">
            {{ header }}
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(row, index) in rows" :key="row.label">
          <SettingsFormTableRow
            :value="props.values[index].value"
            :engine="props.values[index].engine"
            :thermal="values[index].thermal"
            :state="values[index].state"
            :row="row"
            @update:value="
              (value: string) => emit('valueUpdated', value, index)
            "
          />
        </template>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
  import type {
    SettingsTableRow,
    SettingsTableRowValue,
  } from "@/types/settings/table.types";

  import SettingsFormTableRow from "./SettingsFormTableRow.vue";

  const props = defineProps<{
    headers: Array<string>;
    rows: SettingsTableRow[];
    values: SettingsTableRowValue[];
  }>();

  const emit = defineEmits<{
    (e: "valueUpdated", newValue: string, index: number): void;
  }>();
</script>

<style lang="stylus">

  #SettingsTable
    table
      border-radius 10px
      border-collapse collapse
      border-style hidden
      background-color color-bg-primary
      color color-white
      width 100%
      text-align left
      overflow: hidden

      thead
        tr
          background: rgb(2,0,43);
          background: color-bg-primary-gradient
          th
            padding 10px 15px
      tbody
        tr
          border-bottom 1px solid color-border-primary
          transition 0.5s all
          td
            padding 7px 10px
            border-right 1px solid color-border-primary
            div.newvalue-wrapper
              display flex
              flex-direction row
              justify-content space-between
              align-items center
              span
                padding-left 10px
        tr:hover
          background-color color-bg-primary-hover

      tr:last-child td:first-child
        border-bottom-left-radius 10px


      tr:last-child td:last-child
        border-bottom-right-radius 10px
</style>
