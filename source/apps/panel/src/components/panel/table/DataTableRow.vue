<template>
  <td class="table-label" colspan="3">
    {{ props.row.label }}
  </td>
  <td
    v-if="
      props.row.state !== TableRowState.Error &&
      props.row.state !== TableRowState.Loading
    "
    class="table-value"
    colspan="3"
  >
    {{ props.row.value! }}
  </td>
  <td
    v-else-if="props.row.state === TableRowState.Error"
    class="table-value"
    colspan="3"
  >
    Chyba
  </td>
  <td
    v-else-if="props.row.state === TableRowState.Loading"
    class="table-value"
    colspan="3"
  >
    Načítám...
  </td>
</template>

<script lang="ts" setup>
  import { type TableRowData, TableRowState } from "@/types/panel/tables.types";

  const props = defineProps<{
    row: TableRowData;
  }>();
</script>
