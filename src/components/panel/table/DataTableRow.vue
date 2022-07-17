<template>
  <template v-if="row.state === TableRowState.Ok">
    <td class="table-label" colspan="3">
      {{ row.label }}
    </td>
    <td class="table-value" colspan="3">
      {{ row.value! }}
    </td>
  </template>
</template>

<script lang="ts" setup>
  import { TableRowState, type TableRowData } from "@/types/panel/tables.types";
  import { toRefs } from "vue";

  const props = defineProps<{
    row: TableRowData;
  }>();

  const row = toRefs(props.row);
</script>
