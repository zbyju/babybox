<template>
  <tr>
    <td>{{ label }}</td>
    <td>{{ props.row.name }}</td>
    <td>{{ engineString }}</td>
    <td>{{ thermalString }}</td>
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
  import { useConfigStore } from "@/pinia/configStore";
  import { BaseInputState } from "@/types/base/baseInput.types";
  import {
    type SettingsTableRow,
    SettingsTableRowState,
    SettingsTableRowValueType,
  } from "@/types/settings/table.types";
  import {
    displayTemperature,
    displayVoltage,
    prettyFloat,
  } from "@/utils/panel/dataDisplay";
  import { typeToMeasureUnit } from "@/utils/settings/conversions";

  const props = defineProps<{
    row: SettingsTableRow;
    engine: string | null;
    thermal: string | null;
    value: string;
    state: SettingsTableRowState;
  }>();

  const label = computed(() => {
    if (props.row.engine) {
      if (props.row.thermal) {
        return `M${props.row.engine}, T${props.row.thermal}`;
      }
      return "M" + props.row.engine;
    } else if (props.row.thermal) {
      return "T" + props.row.thermal;
    } else {
      return "error";
    }
  });

  function dataToString(
    data: string | null,
    type: SettingsTableRowValueType,
  ): string {
    if (data === null) return "—";
    if (data === "") return "";
    switch (type) {
      case SettingsTableRowValueType.Temperature:
        return displayTemperature(parseInt(data) / 100);
      case SettingsTableRowValueType.Voltage:
        return displayVoltage(
          (parseInt(data) / useConfigStore()?.units?.voltage?.divider || 63) *
            useConfigStore()?.units?.voltage?.multiplier || 100,
        );
      case SettingsTableRowValueType.Seconds:
        return data + " sekund";
      case SettingsTableRowValueType.Days:
        return prettyFloat(parseInt(data) / 86400, 0) + " dní";
      default:
        return data;
    }
  }

  const engineString = computed(() => {
    if (props.engine === null) return "—";
    return dataToString(props.engine, props.row.type);
  });

  const thermalString = computed(() => {
    if (props.thermal === null) return "—";
    return dataToString(props.thermal, props.row.type);
  });

  const inputState = computed((): BaseInputState => {
    return props.state === SettingsTableRowState.Changed
      ? BaseInputState.Accent
      : props.state === SettingsTableRowState.Success
      ? BaseInputState.Success
      : props.state === SettingsTableRowState.Warning
      ? BaseInputState.Warning
      : props.state === SettingsTableRowState.Error
      ? BaseInputState.Error
      : BaseInputState.Neutral;
  });

  const emit = defineEmits<{
    (e: "update:value", value: string): void;
  }>();

  function inputChange(event: Event) {
    emit("update:value", (event.target as HTMLInputElement).value);
  }
</script>
