<template>
  <div id="SettingsTable">
    <table>
      <thead>
        <tr>
          <th v-for="header in headers" :key="header">{{ header }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.label">
          <td>{{ row.label }}</td>
          <td>{{ row.name }}</td>
          <td>{{ row.engine }}</td>
          <td>{{ row.thermal }}</td>
          <td>
            <div class="newvalue-wrapper">
              <input />
              <span class="measure-unit" v-if="row.type !== 'string'"
                >[{{ typeToMeasureUnit(row.type) }}]</span
              >
            </div>
          </td>
          <td>{{ row.recommended }}</td>
          <td>{{ row.note }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { typeToMeasureUnit } from "@/utils/settings/table";

export default defineComponent({
  props: {
    manager: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const headers = props.manager.getHeaders();
    const rows = props.manager.getRows();
    return { headers, rows, typeToMeasureUnit };
  },
});
</script>

<style lang="stylus">
#SettingsTable
  table
    border-radius 10px
    border-collapse collapse
    border-style hidden
    // box-shadow: 0 0 0 2px app-primary;
    background-color #010017
    color white
    width 100%
    text-align left
    overflow: hidden

    thead
      tr
        background: rgb(2,0,43);
        background: linear-gradient(216deg, rgba(2,0,43,1) 0%, rgba(0,48,119,1) 40%, rgba(66,0,116,1) 100%);
        th
          padding 10px 15px
    tbody
      tr
        border-bottom 1px solid #1b1a30
        transition 0.5s all
        td
          padding 7px 10px
          border-right 1px solid #1b1a30
          div.newvalue-wrapper
            display flex
            flex-direction row
            justify-content space-between
            align-items center
            span
              padding-left 10px
            input
              background-color #000
              border 1px solid #2d2b52
              border-radius 5px
              padding 5px 4px
              color white
              flex-grow 1
              font-size 1.1em
      tr:hover
        background-color #020024

    tr:last-child td:first-child
    border-bottom-left-radius 10px


    tr:last-child td:last-child
      border-bottom-right-radius 10px
</style>
