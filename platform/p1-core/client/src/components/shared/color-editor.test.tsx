// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import WebsiteColors from "../../../../../../artifacts/p1-dashboard/src/marketing/WebsiteColors";
import { BRANDING_COLOR_FIELDS } from "./color-editor";

// Mirror the dashboard's deduplicated React runtime across the shared-source boundary.
vi.mock(
  "../../../../../../artifacts/p1-dashboard/node_modules/react",
  async () => await import("react"),
);
vi.mock(
  "../../../../../../artifacts/p1-dashboard/node_modules/react/jsx-runtime",
  async () => await import("react/jsx-runtime"),
);
vi.mock(
  "../../../../../../artifacts/p1-dashboard/node_modules/react/jsx-dev-runtime",
  async () => await import("react/jsx-dev-runtime"),
);
vi.mock(
  "../../../../../../artifacts/p1-dashboard/node_modules/lucide-react",
  async () => await import("lucide-react"),
);
const api = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn() }));
vi.mock("../../../../../../lib/api-client-react/src/dashboard/index", () => ({
  getWebsiteColors: api.load,
  saveWebsiteColors: api.save,
}));
let host: HTMLDivElement;
let root: Root;
const snapshot = () => ({
  version: "original-version",
  colors: {
    ...Object.fromEntries(BRANDING_COLOR_FIELDS.map(({ key }) => [key, ""])),
    brand_primary_color: "legacy custom value",
  } as Record<string, string>,
});
const input = (key: string) => host.querySelector<HTMLInputElement>(`#${key}`)!;
const save = () =>
  host.querySelector<HTMLButtonElement>('[data-testid="button-save-branding-colors"]')!;
const reload = () =>
  Array.from(host.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Reload saved colors"),
  )!;
async function enter(key: string, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
      input(key),
      value,
    );
    input(key).dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function submit() {
  await act(async () =>
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  api.load.mockResolvedValue(snapshot());
  api.save.mockResolvedValue({});
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(<WebsiteColors />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

it("preserves custom values while saving only an edited field through the original grouped controls", async () => {
  expect(host.querySelectorAll(".color-field")).toHaveLength(18);
  expect(host.querySelectorAll(".color-group")).toHaveLength(3);
  expect(host.querySelector(".color-controls input")?.getAttribute("type")).toBe("color");
  expect(input("brand_primary_color").value).toBe("legacy custom value");
  await enter("text_body_color", "#123456");
  const next = snapshot();
  next.colors.text_body_color = "#123456";
  api.load.mockResolvedValue(next);
  await submit();
  expect(api.save).toHaveBeenCalledWith(
    { colors: { text_body_color: "#123456" }, expectedVersion: "original-version" },
    expect.anything(),
  );
  expect(input("brand_primary_color").value).toBe("legacy custom value");
  expect(save().disabled).toBe(true);
});

it("validates changed hex values and preserves the retained preview fallback chains", async () => {
  await enter("text_body_color", "red");
  expect(save().disabled).toBe(true);
  expect(input("text_body_color").getAttribute("aria-invalid")).toBe("true");
  await enter("text_body_color", "#123456");
  expect(save().disabled).toBe(false);
  expect(host.querySelector<HTMLElement>(".color-preview-h1")!.style.color).toBe("rgb(18, 52, 86)");
  expect(host.querySelector<HTMLElement>(".color-preview-h2")!.style.color).toBe("rgb(18, 52, 86)");
  await enter("text_link_color", "#ABCDEF");
  expect(host.querySelector<HTMLElement>(".color-preview-links span")!.style.color).toBe(
    "rgb(171, 205, 239)",
  );
  expect(host.querySelectorAll<HTMLElement>(".color-action")[3].style.backgroundColor).toBe(
    "rgb(168, 98, 58)",
  );
  expect(api.save).not.toHaveBeenCalled();
});

it("synchronizes native color-picker selections into uppercase hex without saving", async () => {
  const picker = host.querySelector<HTMLInputElement>(
    '[data-testid="input-color-brand_secondary_color"]',
  )!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
      picker,
      "#abcdef",
    );
    picker.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(input("brand_secondary_color").value).toBe("#ABCDEF");
  expect(host.querySelectorAll<HTMLElement>(".color-action")[1].style.backgroundColor).toBe(
    "rgb(171, 205, 239)",
  );
  expect(api.save).not.toHaveBeenCalled();
});

it("retains and disables the draft after conflict until confirmed reload", async () => {
  await enter("text_body_color", "#123456");
  api.save.mockRejectedValue(new Error("conflict"));
  await submit();
  expect(input("text_body_color").value).toBe("#123456");
  expect(input("text_body_color").disabled).toBe(true);
  expect(host.querySelector<HTMLInputElement>('input[type="color"]')!.disabled).toBe(true);
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  await act(async () => reload().click());
  expect(input("text_body_color").value).toBe("#123456");
  confirm.mockReturnValue(true);
  await act(async () => reload().click());
  expect(input("text_body_color").value).toBe("");
  expect(input("text_body_color").disabled).toBe(false);
});

it("saves clearing a custom value and guards the draft when post-save confirmation fails", async () => {
  await enter("brand_primary_color", "");
  api.load.mockRejectedValue(new Error("offline"));
  await submit();
  expect(api.save).toHaveBeenCalledWith(
    { colors: { brand_primary_color: "" }, expectedVersion: "original-version" },
    expect.anything(),
  );
  expect(input("brand_primary_color").value).toBe("");
  expect(save().disabled).toBe(true);
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("save completed");
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
});
