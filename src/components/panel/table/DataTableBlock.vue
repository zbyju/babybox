<template>
  <td
    class="table-block"
    :class="[
      block.state === TableBlockState.ColorSuccess
        ? 'color-success'
        : block.state === TableBlockState.ColorWarning
        ? 'color-warning'
        : block.state === TableBlockState.ColorError
        ? 'color-error'
        : '',
    ]"
    :colspan="block.colspan"
  >
    {{
      block.state !== TableBlockState.Inactive
        ? block.activeLabel
        : block.inactiveLabel
    }}
  </td>
</template>

<script lang="ts" setup>
  import {
    TableBlockState,
    type TableBlockData,
  } from "@/types/panel/tables.types";
  import { toRefs } from "vue";

  const props = defineProps<{
    block: TableBlockData;
  }>();

  const block = toRefs(props.block);
</script>
