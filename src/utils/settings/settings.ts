import { SettingsTableData } from "@/types/settings/table";
import _ from "lodash";
import { ref, Ref } from "vue";
import {
  getSettingsHeaders,
  getSettingsTableRows,
  settingsRowMapper,
} from "./table";

export class SettingsManager {
  private ipEngine: string;
  private ipThermal: string;
  private settings: Array<any>;
  private editedSettings: Array<any>;
  private log: Ref<Array<string>>;
  private headers: Ref<Array<string>>;
  private rows: Ref<SettingsTableData>;
  private filteredRows: Ref<SettingsTableData>;

  constructor(ipEngine: string, ipThermal: string) {
    this.ipEngine = ipEngine;
    this.ipThermal = ipThermal;
    this.log = ref([]);
    this.headers = ref(getSettingsHeaders());
    this.rows = ref(settingsRowMapper(getSettingsTableRows()));
    this.filteredRows = _.cloneDeep(this.rows);
  }
  private testConnectionUnit(unit: "engine" | "thermal") {}
  private addLogMessage(message: string) {
    this.log.value.unshift(message);
  }
  testConnection() {}
  loadSettings() {
    this.addLogMessage("Načítám parametry");
  }
  saveSettings() {
    this.addLogMessage("Ukládám parametry");
  }
  deleteChanges() {
    this.addLogMessage("Mažu změny");
  }
  deleteLog() {
    this.log.value = [];
  }
  getHeaders() {
    return this.headers;
  }
  getRows() {
    return this.filteredRows;
  }
  filterEngineRows() {
    this.filteredRows.value = this.rows.value.filter((row) =>
      row.label.includes("M")
    );
  }
  filterThermalRows() {
    this.filteredRows.value = this.rows.value.filter((row) =>
      row.label.includes("T")
    );
  }
  removeFilterRows() {
    this.filteredRows.value = this.rows.value;
  }
}
