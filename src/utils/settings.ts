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

  loadSettings() {
    this.log.value.push("Načítám parametry");
  }
  saveSettings() {
    this.log.value.push("Ukládám parametry");
  }
  deleteChanges() {
    this.log.value.push("Mažu změny");
  }
  deleteLog() {
    this.log.value = [];
  }
}
