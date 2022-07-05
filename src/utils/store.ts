import { getData } from "@/api/units";
import { useConfigStore, type Config } from "@/pinia/configStore";
import { ref } from "vue";
import type { Ref } from "vue";
import type { AppState, UnitsConfig } from "@/types/panel/main";
import _ from "lodash";
import { storeToRefs } from "pinia";
import { getNewState } from "./panel/state";
import { convertSDSTimeToMoment } from "./time";
import { useAppStateStore } from "@/pinia/appStateStore";
import {
    useUnitsStore,
    type EngineUnit,
    type ThermalUnit,
} from "@/pinia/unitsStore";
import type { Connection } from "@/types/panel/connection";
import { useConnectionStore } from "@/pinia/connectionStore";

export class AppManager {
    private panelLoopInterval = null;
    private unitsConfig: Ref<UnitsConfig>;
    private appState: Ref<AppState>;
    private engineUnit: Ref<EngineUnit>;
    private thermalUnit: Ref<ThermalUnit>;
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
        const { engineUnit: euc, thermalUnit: tuc } =
            storeToRefs(connectionStore);
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

    private async updateEngineUnit(timeout: number) {
        const ip = this.unitsConfig.value.engine.ip;
        const postfix = this.unitsConfig.value.postfix;
        try {
            const data = await getData(timeout, ip, postfix);
            this.unitsStore.setEngineUnit(data);
            this.connectionStore.incrementSuccessEngine();
        } catch (err) {
            this.connectionStore.incrementFailEngine();
        }
    }
    private async updateThermalUnit(timeout: number) {
        const ip = this.unitsConfig.value.thermal.ip;
        const postfix = this.unitsConfig.value.postfix;
        try {
            const data = await getData(timeout, ip, postfix);
            this.unitsStore.setThermalUnit(data);
            this.connectionStore.incrementSuccessThermal();
        } catch (err) {
            this.connectionStore.incrementFailThermal();
        }
    }
    private updateClock() {
        const time = convertSDSTimeToMoment(this.engineUnit.value);
        this.unitsStore.setTime(time);
    }
    private updateState() {
        const newState = getNewState(
            this.engineUnit.value,
            this.thermalUnit.value,
            this.connection.value
        );
        if (!_.isEqual(this.appState.value, newState)) {
            this.appStateStore.setState(newState);
        }
        this.updateClock();
    }
    private async updateWatchdogEngine(timeout: number) {
        const ip = this.unitsConfig.value.engine.ip;
        const postfix = this.unitsConfig.value.postfixWatchdog;
        try {
            await getData(timeout, ip, postfix, false);
        } catch (err) {
            // Dont care about the error
        }
    }

    private fetchConfig() {}

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
            appState.message ? delay / 2 : delay
        );
    }

    stopPanelLoop() {
        clearInterval(this.panelLoopInterval);
        return;
    }

    initializeGlobal(): Promise<any> {
        return this.initializeConfig();
    }
}
