import { describe, expect, it } from "vitest";

import router from "./index";

/*
 * router-view in App.vue drives all four screens. A vue-router major bump
 * can change how a path resolves, and nothing else in the suite would show
 * it, so each route is pushed for real and its component checked.
 */

const screens = [
  { path: "/", name: "Main" },
  { path: "/settings", name: "Settings" },
  { path: "/config", name: "Config" },
  { path: "/data", name: "Data" },
];

describe("panel routes", () => {
  for (const screen of screens) {
    it(`resolves ${screen.path} to ${screen.name}`, async () => {
      await router.push(screen.path);
      expect(router.currentRoute.value.name).toBe(screen.name);
    });

    it(`loads a component for ${screen.path}`, async () => {
      await router.push(screen.path);
      const matched = router.currentRoute.value.matched;
      expect(matched).toHaveLength(1);
      expect(matched[0]?.components?.["default"]).toBeDefined();
    });
  }
});
