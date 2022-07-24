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
            v-model="values[index].value.value"
            :engine="values[index].engine.value"
            :thermal="values[index].thermal.value"
            :state="values[index].state.value"
            :row="row"
            @update:model-value="
              (value) => valueUpdated(value, index, row.label)
            "
          />
        </template>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
  import {
    getSettingsTableHeaders,
    getSettingsTableTemplateRows,
    getSettingsTableValues,
  } from "@/defaults/settingsTable.defaults";
  import {
    type SettingsTableRow,
    type SettingsTableRowTemplate,
    SettingsTableRowState,
  } from "@/types/settings/table.types";
  import { isNumber } from "@/utils/number";

  import SettingsFormTableRow from "./SettingsFormTableRow.vue";

  const headers = getSettingsTableHeaders();
  const rows: Array<SettingsTableRow> = getSettingsTableTemplateRows().map(
    (r: SettingsTableRowTemplate, i: number): SettingsTableRow => {
      return {
        ...r,
        index: i,
      };
    },
  );

  const values = getSettingsTableValues(rows);

  function valueUpdated(newValue: string, index: number, label: string) {
    const value = values[index];
    if (!isNumber(newValue)) {
      return (value.state.value = SettingsTableRowState.Error);
    }

    if (label.includes("M")) {
      if (newValue === value.engine.value) {
        value.state.value = SettingsTableRowState.Neutral;
      } else {
        value.state.value = SettingsTableRowState.Changed;
      }
    } else if (label.includes("T")) {
      if (newValue === value.thermal.value) {
        value.state.value = SettingsTableRowState.Neutral;
      } else {
        value.state.value = SettingsTableRowState.Changed;
      }
    }
  }
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
