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
import { useVersionsStore } from "@/pinia/versions";
import type { Maybe } from "@/types/generic.types";
import type { Config, UnitsConfig } from "@/types/panel/config.types";
import type { Connection } from "@/types/panel/connection.types";
import type { PanelState } from "@/types/panel/main.types";
import type { EngineUnit, ThermalUnit } from "@/types/panel/units.types";
import type { Versions } from "@/types/panel/versions.types";
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
  private versionsStore;
  private connectionStore;
  private configStore;
  private panelStateStore;
  private appStateStore;

  constructor() {
    // TODO: Refactor
    const configStore = useConfigStore();
    const versionsStore = useVersionsStore();
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
    this.versionsStore = versionsStore;
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
      fetch("http://localhost:5001/api/v1/config/main")
        .then((response) => {
          return response.json();
        })
        .then((config) => {
          resolve(config);
        });
    });
  }

  private getVersions(): Promise<Versions> {
    return new Promise((resolve) => {
      fetch("http://localhost:5001/api/v1/config/version")
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
    const versions = await this.getVersions();
    if (isInstanceOfConfig(config)) {
      this.configStore.setConfig(config);
      this.versionsStore.setVersions(versions);
      return "Ok";
    } else {
      throw "Config file error";
    }
  }

  private async initializeBackend() {
    try {
      const status = await getStatus();
      if (status) {
        return "OK";
      } else {
        throw "Status not ok";
      }
    } catch (err) {
      if (typeof err === "string") {
        throw err;
      } else {
        throw "Error when fetching backend status";
      }
    }
  }

  async initializeGlobal(): Promise<any> {
    let intervalTime = 5000;
    const interval = setInterval(async () => {
      await this.initializeConfig()
        .then((res) => {
          this.appStateStore.setConfigSuccess();
        })
        .catch((err) => {
          clearInterval(interval);
          this.appStateStore.setConfigError();
        });
      this.initializeBackend()
        .then((res) => {
          clearInterval(interval);
          this.appStateStore.setBackendSuccess(res[0], res[1], res[2]);
        })
        .catch((err) => {
          this.appStateStore.setBackendError();
        });
      intervalTime = 20000;
    }, intervalTime);
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
}
