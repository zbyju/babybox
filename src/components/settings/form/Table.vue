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
              <Input />
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
import { typeToMeasureUnit } from "@/utils/settings/table";
import { defineComponent } from "vue";
import Input from "../../panel/HTMLElements/Input.vue";

export default defineComponent({
  props: {
    manager: {
      type: Object,
      required: true,
    },
  },
  components: {
    Input,
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
