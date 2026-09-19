// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import WebsiteTypography from "../../../../../../artifacts/p1-dashboard/src/marketing/WebsiteTypography";
import { BRANDING_FONT_OPTIONS } from "../../../../shared/website-fonts";

// Mirror dashboard Vite's React deduplication when mounting its source in Core tests.
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
  getWebsiteTypography: api.load,
  saveWebsiteTypography: api.save,
}));
let host: HTMLDivElement;
let root: Root;
const snapshot = () => ({
  version: "original-version",
  fonts: { frontend_heading_font: "inter", frontend_body_font: "legacy-custom" },
  options: BRANDING_FONT_OPTIONS.map(({ value, label, category }) => ({ value, label, category })),
});
const select = (kind: string) => host.querySelector<HTMLSelectElement>(`#frontend_${kind}_font`)!;
const save = () =>
  host.querySelector<HTMLButtonElement>('[data-testid="button-save-branding-fonts"]')!;
const card = (kind: string, font: string) =>
  host.querySelector<HTMLButtonElement>(`[data-testid="button-branding-font-${kind}-${font}"]`)!;
const reload = () =>
  Array.from(host.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Reload saved fonts"),
  )!;
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
  await act(async () => root.render(<WebsiteTypography />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

it("restores all font cards and selects a heading without overwriting custom body values", async () => {
  expect(host.querySelectorAll(".typography-option")).toHaveLength(40);
  expect(card("heading", "inter").getAttribute("aria-pressed")).toBe("true");
  expect(select("body").value).toBe("legacy-custom");
  await act(async () => card("heading", "lora").click());
  expect(select("heading").value).toBe("lora");
  expect(card("heading", "lora").getAttribute("aria-pressed")).toBe("true");
  expect(
    host.querySelector<HTMLElement>(".typography-preview-heading")!.style.fontFamily,
  ).toContain("Lora");
  expect(api.save).not.toHaveBeenCalled();
  const next = snapshot();
  next.fonts.frontend_heading_font = "lora";
  api.load.mockResolvedValue(next);
  await submit();
  expect(api.save).toHaveBeenCalledWith(
    { fonts: { frontend_heading_font: "lora" }, expectedVersion: "original-version" },
    expect.anything(),
  );
  expect(select("body").value).toBe("legacy-custom");
  expect(save().disabled).toBe(true);
});

it("honors a restricted API allowlist for selectable cards and font downloads", async () => {
  const next = snapshot();
  next.options = next.options.filter((option) => option.value === "inter");
  api.load.mockResolvedValue(next);
  await act(async () => reload().click());
  expect(host.querySelectorAll(".typography-option")).toHaveLength(2);
  expect(card("heading", "lora")).toBeNull();
  const sheets = Array.from(
    document.head.querySelectorAll<HTMLLinkElement>(
      'link[href^="https://fonts.googleapis.com/css2?"]',
    ),
  );
  expect(sheets).toHaveLength(1);
  expect(sheets[0].href).toContain("Inter");
  expect(sheets[0].href).not.toContain("legacy-custom");
  expect(sheets[0].href).not.toContain("Lora");
});

it("retains and disables card selections after conflict until confirmed reload", async () => {
  await act(async () => card("heading", "lora").click());
  api.save.mockRejectedValue(new Error("conflict"));
  await submit();
  expect(select("heading").value).toBe("lora");
  expect(card("body", "inter").disabled).toBe(true);
  expect(save().disabled).toBe(true);
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  await act(async () => reload().click());
  expect(select("heading").value).toBe("lora");
  confirm.mockReturnValue(true);
  await act(async () => reload().click());
  expect(select("heading").value).toBe("inter");
  expect(card("body", "inter").disabled).toBe(false);
});

it("saves a theme default and retains the draft when post-save confirmation fails", async () => {
  await act(async () => {
    select("body").value = "";
    select("body").dispatchEvent(new Event("change", { bubbles: true }));
  });
  api.load.mockRejectedValue(new Error("offline"));
  await submit();
  expect(api.save).toHaveBeenCalledWith(
    { fonts: { frontend_body_font: "" }, expectedVersion: "original-version" },
    expect.anything(),
  );
  expect(select("body").value).toBe("");
  expect(save().disabled).toBe(true);
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("save completed");
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
});
