import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import store from "./store";
import { createPinia } from "pinia";

createApp(App).use(createPinia()).use(store).use(router).mount("#app");
