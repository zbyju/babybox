import _ from "lodash";
import { storeToRefs } from "pinia";
import type { Ref } from "vue";
import { ref } from "vue";

import {
  getEngineData,
  getStatus,
  getThermalData,
  updateWatchdog,
} from "@/api/units";
import { useAppStateStore } from "@/pinia/appStateStore";
import { useConfigStore } from "@/pinia/configStore";
import { useConnectionStore } from "@/pinia/connectionStore";
import { usePanelStateStore } from "@/pinia/panelStateStore";
import { useUnitsStore } from "@/pinia/unitsStore";
import { AppState } from "@/types/app/appState.types";
import type { Maybe } from "@/types/generic.types";
import type { Config, UnitsConfig } from "@/types/panel/config.types";
import type { Connection } from "@/types/panel/connection.types";
import type { PanelState } from "@/types/panel/main.types";
import type { EngineUnit, ThermalUnit } from "@/types/panel/units.types";
import { isInstanceOfConfig } from "@/utils/panel/instanceCheck";

import { getNewState } from "./state";

export class AppManager {
  private panelLoopInterval: Maybe<NodeJS.Timer> = undefined;
  private unitsConfig: Ref<UnitsConfig>;
  private panelState: Ref<PanelState>;
  private engineUnit: Ref<Maybe<EngineUnit>>;
  private thermalUnit: Ref<Maybe<ThermalUnit>>;
  private connection: Ref<Connection>;

  private unitsStore;
  private connectionStore;
  private configStore;
  private panelStateStore;
  private appStateStore;

  constructor() {
    // TODO: Refactor
    const configStore = useConfigStore();
    const panelStateStore = usePanelStateStore();
    const unitsStore = useUnitsStore();
    const connectionStore = useConnectionStore();
    const appStateStore = useAppStateStore();
    const { units } = storeToRefs(configStore);
    const { message, active } = storeToRefs(panelStateStore);
    const { engineUnit, thermalUnit } = storeToRefs(unitsStore);
    const { engineUnit: euc, thermalUnit: tuc } = storeToRefs(connectionStore);
    this.unitsConfig = units;
    this.panelState = ref({ message, active });
    this.engineUnit = engineUnit;
    this.thermalUnit = thermalUnit;
    this.connection = ref({ engineUnit: euc, thermalUnit: tuc });

    this.unitsStore = unitsStore;
    this.connectionStore = connectionStore;
    this.configStore = configStore;
    this.panelStateStore = panelStateStore;
    this.appStateStore = appStateStore;
  }

  private async updateEngineUnit() {
    try {
      const data = await getEngineData();
      this.unitsStore.setRawEngineUnit(data);
      if (data !== undefined) {
        this.connectionStore.incrementSuccessEngine();
      } else {
        this.connectionStore.incrementFailEngine();
      }
    } catch (err) {
      this.connectionStore.incrementFailEngine();
    }
  }
  private async updateThermalUnit() {
    try {
      const data = await getThermalData();
      this.unitsStore.setRawThermalUnit(data);
      if (data !== undefined) {
        this.connectionStore.incrementSuccessThermal();
      } else {
        this.connectionStore.incrementFailThermal();
      }
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
    if (!_.isEqual(this.panelState.value, newState)) {
      this.panelStateStore.setState(newState);
    }
    this.updateClock();
  }
  private async updateWatchdogEngine(timeout = 5000) {
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
    if (isInstanceOfConfig(config)) {
      this.configStore.setConfig(config);
      const { status, version, engineIP, thermalIP } = await getStatus();
      if (status === true) {
        this.appStateStore.setState({
          state: AppState.Ok,
          versionBackend: version,
          engineIP,
          thermalIP,
        });
      }
    } else {
      this.appStateStore.setState({
        state: AppState.Error,
        message: "Config soubor je v neplatném formátu.",
      });
    }
  }

  async startPanelLoop() {
    const delay = this.unitsConfig.value.requestDelay || 2000;
    const panelState = this.panelState.value;
    this.panelLoopInterval = setInterval(
      () => {
        this.updateEngineUnit();
        this.updateThermalUnit();
        this.updateState();
        this.updateWatchdogEngine();
      },
      panelState.message ? delay / 2 : delay,
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
