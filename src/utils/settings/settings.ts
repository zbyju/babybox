import { ref, Ref } from "vue";

export class SettingsManager {
  private ipEngine: string;
  private ipThermal: string;
  private settings: Array<any>;
  private editedSettings: Array<any>;
  private log: Ref<Array<string>>;

  constructor(ipEngine: string, ipThermal: string) {
    this.ipEngine = ipEngine;
    this.ipThermal = ipThermal;
    this.log = ref([]);
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
}
