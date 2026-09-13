import { beforeEach, describe, expect, it } from "vitest";

import {
  bannerFor,
  clearBanner,
  readBanner,
  rememberBanner,
} from "@/logic/config/restartBanner";

describe("bannerFor", () => {
  /*
   * The tier says backendRestart for the two address fields, but a save that did
   * not touch them leaves nothing to restart for. The banner follows the answer,
   * not the tier.
   */
  it("says nothing when the backend applied everything", () => {
    expect(bannerFor({ kind: "applied", unapplied: [] })).toBeNull();
  });

  /*
   * The field is named by the label the form shows, not by its dotted path, and a
   * changed port also names the address the panel comes back on after the restart.
   */
  it("names the field by its label and says where the panel will be", () => {
    const banner = bannerFor({
      kind: "applied",
      unapplied: [{ path: "backend.port", running: 5000, stored: 5050 }],
    });

    expect(banner).toBe(
      "Restartuj backend, tyto hodnoty se použijí až potom: Port (běží 5000, uloženo 5050). Panel pak poběží na http://localhost:5050.",
    );
  });

  it("lists every field the backend could not apply", () => {
    const banner = bannerFor({
      kind: "applied",
      unapplied: [
        { path: "backend.port", running: 5000, stored: 5050 },
        { path: "backend.url", running: "/api/v1", stored: "/api/v2" },
      ],
    });

    expect(banner).toContain("Port (běží 5000, uloženo 5050)");
    expect(banner).toContain("Předpona API (běží /api/v1, uloženo /api/v2)");
  });

  /* Only a changed port moves the panel, so nothing else may promise an address. */
  it("says nothing about the address when only the prefix is unapplied", () => {
    const banner = bannerFor({
      kind: "applied",
      unapplied: [
        { path: "backend.url", running: "/api/v1", stored: "/api/v2" },
      ],
    });

    expect(banner).toBe(
      "Restartuj backend, tyto hodnoty se použijí až potom: Předpona API (běží /api/v1, uloženo /api/v2).",
    );
  });

  /* A path the form draws no row for still has to read as something. */
  it("falls back to the path when no field carries that label", () => {
    const banner = bannerFor({
      kind: "applied",
      unapplied: [{ path: "backend.nothing", running: 1, stored: 2 }],
    });

    expect(banner).toContain("backend.nothing (běží 1, uloženo 2)");
  });

  /* A failed reload leaves every backend-read field on the old value, not just two. */
  it("names all the backend fields when the reload failed", () => {
    const banner = bannerFor({ kind: "reloadFailed" });

    expect(banner).toBe(
      "Backend novou konfiguraci nenačetl. Dokud ho nerestartuješ, běží dál na staré hodnotě: IP jednotek, operační systém, port backendu a předpona API.",
    );
  });
});

describe("the banner across a panel reload", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("hands the text to the page that comes up after the reload", () => {
    rememberBanner("Restartuj backend.");

    expect(readBanner()).toBe("Restartuj backend.");
  });

  it("has nothing to show when no save left one", () => {
    expect(readBanner()).toBeNull();
  });

  it("does not consume the text, so a second read still finds it", () => {
    rememberBanner("Restartuj backend.");
    readBanner();

    expect(readBanner()).toBe("Restartuj backend.");
  });

  /* A save with nothing left to restart has to drop what an earlier one wrote. */
  it("clears an earlier banner when the next save needs no restart", () => {
    rememberBanner("Restartuj backend.");
    rememberBanner(bannerFor({ kind: "applied", unapplied: [] }));

    expect(readBanner()).toBeNull();
  });

  it("is gone for good once it is dismissed", () => {
    rememberBanner("Restartuj backend.");
    clearBanner();

    expect(readBanner()).toBeNull();
  });
});
