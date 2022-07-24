<template>
  <tr>
    <td>{{ props.row.label }}</td>
    <td>{{ props.row.name }}</td>
    <td>{{ props.engine }}</td>
    <td>{{ props.thermal }}</td>
    <td>
      <div class="newvalue-wrapper">
        <BaseInput
          type="text"
          :value="props.value"
          :state="inputState"
          @input="inputChange"
        />
        <span v-if="props.row.type !== 'string'" class="measure-unit"
          >[{{ typeToMeasureUnit(props.row.type) }}]</span
        >
      </div>
    </td>
    <td>{{ props.row.recommended }}</td>
    <td>{{ props.row.note }}</td>
  </tr>
</template>

<script lang="ts" setup>
  import { computed } from "vue";

  import BaseInput from "@/components/panel/HTMLElements/BaseInput.vue";
  import { BaseInputState } from "@/types/base/baseInput.types";
  import {
    type SettingsTableRow,
    SettingsTableRowState,
  } from "@/types/settings/table.types";
  import { typeToMeasureUnit } from "@/utils/settings/conversions";

  const props = defineProps<{
    row: SettingsTableRow;
    engine: string;
    thermal: string;
    value: string;
    state: SettingsTableRowState;
  }>();

  const inputState = computed(
    (): BaseInputState =>
      props.state === SettingsTableRowState.Changed
        ? BaseInputState.Accent
        : props.state === SettingsTableRowState.Success
        ? BaseInputState.Success
        : props.state === SettingsTableRowState.Warning
        ? BaseInputState.Warning
        : props.state === SettingsTableRowState.Error
        ? BaseInputState.Error
        : BaseInputState.Neutral,
  );

  const emit = defineEmits<{
    (e: "update:value", value: string): void;
  }>();

  function inputChange(event: Event) {
    emit("update:value", (event.target as HTMLInputElement).value);
  }
</script>
