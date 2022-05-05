import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import Data from "../views/Data.vue";
import Main from "../views/Main.vue";
import Settings from "../views/Settings.vue";

const routes: Array<RouteRecordRaw> = [
  {
    path: "/",
    name: "Main",
    component: Main,
  },
  {
    path: "/settings",
    name: "Settings",
    component: Settings,
  },
  {
    path: "/data",
    name: "Data",
    component: Data,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
