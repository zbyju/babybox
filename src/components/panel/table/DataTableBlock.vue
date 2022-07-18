<template>
  <td
    class="table-block"
    :class="[
      props.block.state === TableBlockState.ColorSuccess
        ? 'color-success'
        : props.block.state === TableBlockState.ColorWarning
        ? 'color-warning'
        : props.block.state === TableBlockState.ColorError
        ? 'color-error'
        : '',
    ]"
    :colspan="props.block.colspan"
  >
    {{
      props.block.state !== TableBlockState.Inactive
        ? props.block.activeLabel
        : props.block.inactiveLabel
    }}
  </td>
</template>

<script lang="ts" setup>
  import {
    TableBlockState,
    type TableBlockData,
  } from "@/types/panel/tables.types";

  const props = defineProps<{
    block: TableBlockData;
  }>();
</script>
