import _ from "lodash";
import { storeToRefs } from "pinia";
import type { Ref } from "vue";
import { ref } from "vue";

import { getEngineData, getThermalData, updateWatchdog } from "@/api/units";
import { useAppStateStore } from "@/pinia/appStateStore";
import { useConfigStore } from "@/pinia/configStore";
import { useConnectionStore } from "@/pinia/connectionStore";
import { useUnitsStore } from "@/pinia/unitsStore";
import type { Maybe } from "@/types/generic.types";
import type { UnitsConfig } from "@/types/panel/config.types";
import type { Connection } from "@/types/panel/connection.types";
import type { AppState } from "@/types/panel/main.types";
import type { EngineUnit, ThermalUnit } from "@/types/panel/units.types";

import { getNewState } from "./state";

export class AppManager {
  private panelLoopInterval: Maybe<NodeJS.Timer> = undefined;
  private unitsConfig: Ref<Maybe<UnitsConfig>>;
  private appState: Ref<AppState>;
  private engineUnit: Ref<Maybe<EngineUnit>>;
  private thermalUnit: Ref<Maybe<ThermalUnit>>;
  private connection: Ref<Connection>;

  private unitsStore;
  private connectionStore;
  private configStore;
  private appStateStore;

  constructor() {
    // TODO: Refactor
    const configStore = useConfigStore();
    const appStateStore = useAppStateStore();
    const unitsStore = useUnitsStore();
    const connectionStore = useConnectionStore();
    const { units } = storeToRefs(configStore);
    const { message, active } = storeToRefs(appStateStore);
    const { engineUnit, thermalUnit } = storeToRefs(unitsStore);
    const { engineUnit: euc, thermalUnit: tuc } = storeToRefs(connectionStore);
    this.unitsConfig = units;
    this.appState = ref({ message, active });
    this.engineUnit = engineUnit;
    this.thermalUnit = thermalUnit;
    this.connection = ref({ engineUnit: euc, thermalUnit: tuc });

    this.unitsStore = unitsStore;
    this.connectionStore = connectionStore;
    this.configStore = configStore;
    this.appStateStore = appStateStore;
  }

  private async updateEngineUnit() {
    try {
      const data = await getEngineData();
      this.unitsStore.setRawEngineUnit(data);
      this.connectionStore.incrementSuccessEngine();
    } catch (err) {
      this.connectionStore.incrementFailEngine();
    }
  }
  private async updateThermalUnit() {
    try {
      const data = await getThermalData();
      this.unitsStore.setRawThermalUnit(data);
      this.connectionStore.incrementSuccessThermal();
    } catch (err) {
      this.connectionStore.incrementFailThermal();
    }
  }
  private updateClock() {
    const time = this.engineUnit.value?.data.time;
    this.unitsStore.setTime(time);
  }
  private updateState() {
    const newState = getNewState(
      this.engineUnit.value,
      this.thermalUnit.value,
      this.connection.value,
    );
    if (!_.isEqual(this.appState.value, newState)) {
      this.appStateStore.setState(newState);
    }
    this.updateClock();
  }
  private async updateWatchdogEngine(timeout: number) {
    try {
      await updateWatchdog();
    } catch (err) {
      // Dont care about the error
    }
  }

  private getConfig(): Promise<Config> {
    return new Promise((resolve) => {
      fetch("config/config.json")
        .then((response) => {
          return response.json();
        })
        .then((config) => {
          resolve(config);
        });
    });
  }

  private async initializeConfig() {
    const config = await this.getConfig();
    this.configStore.setConfig(config);
  }

  async startPanelLoop() {
    const delay = this.unitsConfig.value.requestDelay || 2000;
    const timeout = this.unitsConfig.value.requestTimeout || 5000;
    const appState = this.appState.value;
    this.panelLoopInterval = setInterval(
      () => {
        this.updateEngineUnit(timeout);
        this.updateThermalUnit(timeout);
        this.updateState();
        this.updateWatchdogEngine(timeout);
      },
      appState.message ? delay / 2 : delay,
    );
  }

  stopPanelLoop() {
    if (this.panelLoopInterval !== undefined) {
      clearInterval(this.panelLoopInterval);
    }
    return;
  }

  initializeGlobal(): Promise<any> {
    return this.initializeConfig();
  }
}
