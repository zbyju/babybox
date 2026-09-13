import { beforeEach, describe, expect, it } from "vitest";

import {
  type SaveOutcome,
  bannerFor,
  clearBanner,
  readBanner,
  rememberBanner,
} from "@/logic/config/restartBanner";

describe("bannerFor", () => {
  it("says nothing when the form sent nothing", () => {
    expect(bannerFor({ kind: "notSent" })).toBeNull();
  });

  it("says nothing when configer refused the body", () => {
    const outcome: SaveOutcome = {
      kind: "rejected",
      errors: [{ path: "backend.port", msg: "must be an integer" }],
    };

    expect(bannerFor(outcome)).toBeNull();
  });

  /*
   * The tier says backendRestart for the two address fields, but a save that did
   * not touch them leaves nothing to restart for. The banner follows the answer,
   * not the tier.
   */
  it("says nothing when the backend applied everything", () => {
    expect(bannerFor({ kind: "applied", unapplied: [] })).toBeNull();
  });

  it("names the field, the running value and the stored one", () => {
    const banner = bannerFor({
      kind: "applied",
      unapplied: [{ path: "backend.port", running: 5000, stored: 5050 }],
    });

    expect(banner).toBe(
      "Restartuj backend, tyto hodnoty se použijí až potom: backend.port (běží 5000, uloženo 5050).",
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

    expect(banner).toContain("backend.port (běží 5000, uloženo 5050)");
    expect(banner).toContain("backend.url (běží /api/v1, uloženo /api/v2)");
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
