import { useConfigStore } from "@/pinia/configStore";
import type { EngineUnit, ThermalUnit } from "@/pinia/unitsStore";
import type { Connection } from "@/types/panel/connection";
import type { TableBlockData, TableData } from "@/types/panel/tables";
import { storeToRefs } from "pinia";
import {
    beamAboveContainer,
    errorInnerTemperature,
    errorVoltageBattery,
    errorVoltageGSM,
    errorVoltageIn,
    errorVoltageUnits,
    parseBoolean,
    prettyTemperature,
    prettyTwoNumbers,
    prettyTwoPercentages,
    prettyTwoTemperatures,
    prettyVoltage,
    secondsToTime,
} from "./data";

export const getRowsTableTemperatures = (
    engineData: EngineUnit,
    thermalData: ThermalUnit
): TableData => {
    return [
        {
            label: "Cílová teplota 1|2",
            value: prettyTemperature(thermalData[0].value),
        },
        {
            label: "Vnitřní teplota",
            value: prettyTwoTemperatures(
                thermalData[29].value,
                engineData[28].value
            ),
            error: errorInnerTemperature(engineData, thermalData),
        },
        {
            label: "Venkovní teplota",
            value: prettyTemperature(thermalData[28].value),
        },
        {
            label: "Vnitřní výměník vzduch",
            value: prettyTemperature(thermalData[31].value),
        },
        {
            label: "Venkovní výměník vzduch",
            value: prettyTemperature(thermalData[32].value),
        },
        {
            label: "Vnitřní plášť teplota",
            value: prettyTemperature(thermalData[30].value),
        },
    ];
};

export const getBlocksTableTemperature = (
    engineData: EngineUnit,
    thermalData: ThermalUnit
): TableBlockData => {
    return [
        [
            {
                label: "Topí plášť",
                active: thermalData[24].value === "255",
                colspan: 2,
                color: "color-success",
            },
            {
                label: "Topí vzduch",
                active: thermalData[25].value === "255",
                colspan: 2,
                color: "color-success",
            },
            {
                label: "Chladí vzduch",
                active: thermalData[26].value === "255",
                colspan: 2,
                color: "color-success",
            },
        ],
    ];
};

export const getRowsVoltage = (
    engineData: EngineUnit,
    thermalData: ThermalUnit
): TableData => {
    return [
        {
            label: "Zdroj",
            value: prettyVoltage(thermalData[35].value),
            error: errorVoltageIn(engineData, thermalData),
        },
        {
            label: "Akumulátor",
            value: prettyVoltage(thermalData[36].value),
            error: errorVoltageBattery(engineData, thermalData),
        },
        {
            label: "Řídící jednotky",
            value: prettyVoltage(thermalData[37].value),
            error: errorVoltageUnits(engineData, thermalData),
        },
        {
            label: "GSM Komunikátor",
            value: prettyVoltage(thermalData[38].value),
            error: errorVoltageGSM(engineData, thermalData),
        },
        {
            label: "Zdroj cíl",
            value: "14-15V",
        },
        {
            label: "Akumulátor cíl",
            value: "12,8-14V",
        },
        {
            label: "Řídící jednotky cíl",
            value: "12,1-13V",
        },
    ];
};

export const getRowsTableDoors = (
    engineData: EngineUnit,
    _: ThermalUnit
): TableData => {
    return [
        {
            label: "Levé poloha",
            value: engineData[37].value,
        },
        {
            label: "Levé zátěž",
            value: engineData[46].value,
        },
        {
            label: "Pravé poloha",
            value: engineData[38].value,
        },
        {
            label: "Pravé zátěž",
            value: engineData[47].value,
        },
        {
            label: "Paprsek nad vaničkou",
            value: beamAboveContainer(engineData[17].value),
        },
    ];
};

export const getBlocksTableDoors = (
    engineData: EngineUnit,
    _: ThermalUnit
): TableBlockData => {
    return [
        [
            {
                label: "Blokováno",
                nonActiveLabel: "Neblokováno",
                active: parseBoolean(engineData[45].value),
                colspan: 6,
                color: "color-error",
            },
        ],
    ];
};

export const getRowsTableConnection = (
    engineData: EngineUnit,
    _: ThermalUnit,
    connection: Connection
): TableData => {
    const configStore = useConfigStore();
    const { units } = storeToRefs(configStore);
    return [
        {
            label: "PC dotaz",
            value: prettyTwoNumbers(
                connection.engineUnit.requests,
                connection.thermalUnit.requests
            ),
        },
        {
            label: "BB odpověď",
            value: prettyTwoNumbers(
                connection.engineUnit.successes,
                connection.thermalUnit.successes
            ),
        },
        {
            label: "Ztracené odpovědi",
            value: prettyTwoNumbers(
                connection.engineUnit.fails,
                connection.thermalUnit.fails
            ),
        },
        {
            label: "Kvalita spojení",
            value: prettyTwoPercentages(
                connection.engineUnit.getQuality(),
                connection.thermalUnit.getQuality()
            ),
        },
        {
            label: "Limit spojení",
            value: units.value.requestTimeout + "ms",
        },
        {
            label: "Čas do zkoušky",
            value: secondsToTime(engineData[59].value),
        },
    ];
};
