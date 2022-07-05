import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import DataView from "../views/DataView.vue";
import MainView from "../views/MainView.vue";
import SettingsView from "../views/SettingsView.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Main",
    component: MainView,
  },
  {
    path: "/settings",
    name: "Settings",
    component: SettingsView,
  },
  {
    path: "/data",
    name: "Data",
    component: DataView,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
