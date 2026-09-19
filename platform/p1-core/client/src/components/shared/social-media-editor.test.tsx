// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import WebsiteSocial from "../../../../../../artifacts/p1-dashboard/src/marketing/WebsiteSocial";
import { SOCIAL_SETTING_KEYS } from "../../../../shared/social-media";

// Mirror the dashboard Vite config's React deduplication across the retained Core source boundary.
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
  getWebsiteSocial: api.load,
  saveWebsiteSocial: api.save,
}));
let host: HTMLDivElement;
let root: Root;
const snapshot = () => ({
  version: "original-version",
  settings: Object.fromEntries(
    SOCIAL_SETTING_KEYS.map((key) => [key, key === "social_icon_style" ? "brand" : ""]),
  ),
});
const input = () => host.querySelector<HTMLInputElement>("#social-facebook")!;
const save = () =>
  host.querySelector<HTMLButtonElement>('[data-testid="button-save-social-media"]')!;
async function enter(value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input(), value);
    input().dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function submit() {
  await act(async () => {
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  api.load.mockResolvedValue(snapshot());
  api.save.mockResolvedValue({});
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root.render(<WebsiteSocial />);
  });
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

it("prefills only empty URLs, previews safe links and preserves the versioned changed-field save", async () => {
  expect(save().disabled).toBe(true);
  await act(async () => input().focus());
  expect(input().value).toBe("https://");
  expect(save().disabled).toBe(true);
  await enter("https://https://facebook.com/p1");
  expect(input().value).toBe("https://facebook.com/p1");
  expect(host.querySelector('[data-testid="link-social-facebook"]')?.getAttribute("href")).toBe(
    "https://facebook.com/p1",
  );
  const next = snapshot();
  next.settings.social_facebook_url = "https://facebook.com/p1";
  api.load.mockResolvedValue(next);
  await submit();
  expect(api.save).toHaveBeenCalledWith(
    {
      settings: { social_facebook_url: "https://facebook.com/p1" },
      expectedVersion: "original-version",
    },
    expect.anything(),
  );
  expect(save().disabled).toBe(true);
  expect(host.querySelector('[role="status"]')?.textContent).toContain("Social settings saved");
});

it("keeps the draft and blocks editing after a conflict until an explicit confirmed reload", async () => {
  await enter("https://facebook.com/draft");
  api.save.mockRejectedValue(new Error("conflict"));
  await submit();
  expect(input().value).toBe("https://facebook.com/draft");
  expect(input().disabled).toBe(true);
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("could not be confirmed");
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  const reload = Array.from(host.querySelectorAll("button")).find((button) =>
    button.textContent?.includes("Reload"),
  )!;
  await act(async () => reload.click());
  expect(input().value).toBe("https://facebook.com/draft");
  confirm.mockReturnValue(true);
  await act(async () => reload.click());
  expect(input().value).toBe("");
  expect(input().disabled).toBe(false);
  confirm.mockRestore();
});

it("updates the draft style preview and retains recovery protection if save confirmation reload fails", async () => {
  await enter("https://facebook.com/draft");
  const style = host.querySelector<HTMLSelectElement>("#social-icon-style")!;
  await act(async () => {
    style.value = "outline";
    style.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(
    host
      .querySelector('[data-testid="link-social-facebook"]')
      ?.classList.contains("social-media-link-outline"),
  ).toBe(true);
  api.load.mockRejectedValue(new Error("offline"));
  await submit();
  expect(api.save).toHaveBeenCalledWith(
    {
      settings: { social_facebook_url: "https://facebook.com/draft", social_icon_style: "outline" },
      expectedVersion: "original-version",
    },
    expect.anything(),
  );
  expect(input().value).toBe("https://facebook.com/draft");
  expect(input().disabled).toBe(true);
  expect(style.value).toBe("outline");
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("save completed");
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
});
