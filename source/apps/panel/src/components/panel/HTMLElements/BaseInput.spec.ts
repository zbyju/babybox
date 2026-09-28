import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "vue";

import BaseInput from "./BaseInput.vue";

/*
 * These bindings pass the prop straight to the DOM, so what the nurse sees
 * depends on how Vue serialises undefined and false. A vue bump can change
 * that, which is why the rendered result is asserted and not the props.
 */

const mounted: Array<() => void> = [];

function render(props: Record<string, unknown>): HTMLInputElement {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const app = createApp(BaseInput, { type: "text", ...props });
  app.mount(host);
  mounted.push(() => {
    app.unmount();
    host.remove();
  });
  const input = host.querySelector("input");
  if (input === null) {
    throw new Error("BaseInput rendered no input element");
  }
  return input;
}

afterEach(() => {
  while (mounted.length > 0) {
    const cleanUp = mounted.pop();
    if (cleanUp !== undefined) {
      cleanUp();
    }
  }
});

describe("BaseInput optional attributes", () => {
  it("leaves placeholder off when none is passed", () => {
    const input = render({});
    expect(input.hasAttribute("placeholder")).toBe(false);
  });

  it("sets placeholder when one is passed", () => {
    const input = render({ placeholder: "Heslo" });
    expect(input.getAttribute("placeholder")).toBe("Heslo");
  });

  it("leaves pattern off when none is passed", () => {
    const input = render({});
    expect(input.hasAttribute("pattern")).toBe(false);
  });

  it("sets pattern when one is passed", () => {
    const input = render({ pattern: "[0-9]+" });
    expect(input.getAttribute("pattern")).toBe("[0-9]+");
  });
});

describe("BaseInput value and disabled", () => {
  it("shows an empty value when no model value is passed", () => {
    expect(render({}).value).toBe("");
  });

  it("shows the model value when one is passed", () => {
    expect(render({ modelValue: "abc" }).value).toBe("abc");
  });

  it("is enabled when disabled is not passed", () => {
    expect(render({}).disabled).toBe(false);
  });

  it("is enabled when disabled is false", () => {
    expect(render({ disabled: false }).disabled).toBe(false);
  });

  it("is disabled when disabled is true", () => {
    expect(render({ disabled: true }).disabled).toBe(true);
  });
});
