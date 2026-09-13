import { afterEach, describe, expect, it, vi } from "vitest";

import {
  focusPanelPassword,
  PANEL_PASSWORD_INPUT_ID,
  scrollWindowToTop,
} from "../scroll";

describe("focusPanelPassword", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("scrolls the password input into view and focuses it", () => {
    const input = document.createElement("input");
    input.id = PANEL_PASSWORD_INPUT_ID;
    input.scrollIntoView = vi.fn();
    const focus = vi.spyOn(input, "focus");
    document.body.appendChild(input);

    focusPanelPassword(document);

    expect(input.scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "end",
    });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("does nothing when the password input is not on the page", () => {
    expect(() => focusPanelPassword(document)).not.toThrow();
  });

  it("ignores a node with the same id that is not an input", () => {
    const decoy = document.createElement("div");
    decoy.id = PANEL_PASSWORD_INPUT_ID;
    decoy.scrollIntoView = vi.fn();
    document.body.appendChild(decoy);

    focusPanelPassword(document);

    expect(decoy.scrollIntoView).not.toHaveBeenCalled();
  });
});

describe("scrollWindowToTop", () => {
  it("scrolls the window to the top", () => {
    const scrollTo = vi.fn();

    scrollWindowToTop({ scrollTo });

    expect(scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "smooth",
    });
  });
});
