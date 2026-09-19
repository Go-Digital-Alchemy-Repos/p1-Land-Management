import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import SidebarManager from "../src/marketing/SidebarManager";
const state = vi.hoisted(() => ({
  owned: true,
  verify: vi.fn(),
  api: Object.fromEntries(
    [
      "listMarketingSidebars",
      "getMarketingSidebar",
      "createMarketingSidebar",
      "updateMarketingSidebar",
      "deleteMarketingSidebar",
      "getMarketingSidebarReferences",
    ].map((name) => [name, vi.fn()]),
  ),
}));
vi.mock("@workspace/api-client-react/dashboard", () => state.api);
vi.mock("../src/marketing/useSidebarReservation", () => ({
  useSidebarReservation: () => ({
    owned: state.owned,
    verify: state.verify,
    acquire: vi.fn(),
    error: "",
    holder: "Other editor",
  }),
}));
vi.mock("../src/marketing/useCmsUnsavedChanges", () => ({
  useCmsUnsavedChanges: vi.fn(),
}));
const fixture = {
  id: "sidebar-one",
  name: "Fixture Sidebar",
  description: "For local tests",
  isDefault: true,
  widgets: [
    {
      id: "form-one",
      type: "form",
      title: "Saved form",
      future: "retain",
      settings: {
        formSlug: "missing-form",
        description: "Original",
        future: { keep: true },
      },
    },
    {
      id: "posts",
      type: "recent-posts",
      title: "Posts",
      settings: { limit: 4 },
    },
  ],
};
let root: Root, host: HTMLDivElement;
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  state.owned = true;
  state.verify.mockResolvedValue(undefined);
  state.api.listMarketingSidebars.mockResolvedValue([structuredClone(fixture)]);
  state.api.getMarketingSidebar.mockResolvedValue(structuredClone(fixture));
  state.api.getMarketingSidebarReferences.mockResolvedValue({
    forms: [
      { id: "contact", slug: "contact-form", name: "Contact", kind: "contact" },
      {
        id: "newsletter",
        slug: "newsletter-signup",
        name: "Newsletter",
        kind: "newsletter",
      },
      {
        id: "application",
        slug: "job-application",
        name: "Application",
        kind: "application",
      },
    ],
  });
  state.api.createMarketingSidebar.mockImplementation(async (draft) => ({
    ...draft,
    id: "created-sidebar",
  }));
  state.api.updateMarketingSidebar.mockImplementation(async (_id, draft) => ({
    ...draft,
    id: "sidebar-one",
  }));
  vi.spyOn(window, "confirm").mockReturnValue(true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});
async function render() {
  await act(async () => root.render(<SidebarManager />));
}
async function edit() {
  await render();
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>('[aria-label="Edit Fixture Sidebar"]')!
      .click(),
  );
}
async function change(selector: string, value: string) {
  await act(async () => {
    const element = host.querySelector(selector) as
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement;
    const prototype =
      element.tagName === "SELECT"
        ? HTMLSelectElement.prototype
        : element.tagName === "TEXTAREA"
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(
      element,
      value,
    );
    element.dispatchEvent(
      new Event(element.tagName === "SELECT" ? "change" : "input", {
        bubbles: true,
      }),
    );
  });
}
async function save() {
  await act(async () => {
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}
it("restores list cards, default badge and original Details/Widgets help with all eight types", async () => {
  await render();
  expect(host.querySelector("h1")?.textContent).toBe("Sidebars & Widgets");
  expect(host.textContent).toContain("Default Blog");
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>('[aria-label="Edit Fixture Sidebar"]')!
      .click(),
  );
  expect(host.textContent).toContain("Sidebar Details");
  expect(host.textContent).toContain("Stack widgets in the order");
  const add = host.querySelector('select[aria-label="Add widget"]')!;
  expect(add.querySelectorAll("option")).toHaveLength(9);
  expect(host.querySelectorAll("h1")).toHaveLength(1);
});
it("preserves unavailable Form references, future fields and draft settings when changing widget type", async () => {
  await edit();
  expect(
    host.querySelector<HTMLSelectElement>('select[aria-label="Assigned form"]')!
      .value,
  ).toBe("missing-form");
  expect(host.textContent).toContain("Saved form: missing-form");
  await change('[data-testid="input-widget-title-form-one"]', "Changed");
  await change(
    '[data-testid="sidebar-widget-form-one"] select[aria-label="Widget type"]',
    "newsletter",
  );
  await save();
  expect(state.verify).toHaveBeenCalled();
  const payload = state.api.updateMarketingSidebar.mock.calls[0][1];
  expect(payload.widgets[0]).toMatchObject({
    type: "newsletter",
    title: "Changed",
    future: "retain",
    settings: { formSlug: "missing-form", future: { keep: true } },
  });
});
it("adds all eight widget types and preserves an unavailable Newsletter form option", async () => {
  await render();
  await act(async () => {
    Array.from(host.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Create Sidebar")!
      .click();
  });
  expect(host.textContent).toContain("No widgets yet");
  for (const type of [
    "recent-posts",
    "newsletter",
    "form",
    "callout",
    "search",
    "categories",
    "tag-cloud",
    "custom-html",
  ])
    await change('select[aria-label="Add widget"]', type);
  expect(
    host.querySelectorAll('[data-testid^="sidebar-widget-"]'),
  ).toHaveLength(8);
  await change('[data-testid="input-sidebar-name"]', "All widgets");
  await save();
  expect(
    state.api.createMarketingSidebar.mock.calls[0][0].widgets.map(
      (widget: any) => widget.type,
    ),
  ).toEqual([
    "recent-posts",
    "newsletter",
    "form",
    "callout",
    "search",
    "categories",
    "tag-cloud",
    "custom-html",
  ]);
});
it("keeps reorder/removal confirmation and preserves local changes after failed save", async () => {
  await edit();
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>('[aria-label="Move widget 2 up"]')!
      .click(),
  );
  vi.mocked(window.confirm).mockReturnValue(false);
  await act(async () =>
    host
      .querySelector<HTMLButtonElement>('[aria-label="Remove widget 1"]')!
      .click(),
  );
  state.api.updateMarketingSidebar.mockRejectedValue(Error("Save failed"));
  await save();
  expect(
    state.api.updateMarketingSidebar.mock.calls[0][1].widgets.map(
      (widget: any) => widget.id,
    ),
  ).toEqual(["posts", "form-one"]);
  expect(
    host.querySelectorAll('[data-testid^="sidebar-widget-"]'),
  ).toHaveLength(2);
  expect(host.textContent).toContain("Save failed");
});
it("blocks writes when reservation is absent or verification is rejected", async () => {
  state.owned = false;
  await edit();
  expect(host.querySelector("fieldset")!.disabled).toBe(true);
  await save();
  expect(state.api.updateMarketingSidebar).not.toHaveBeenCalled();
});
it("does not send a save when the current reservation is lost during verification", async () => {
  await edit();
  state.verify.mockRejectedValue(Error("Reservation lost"));
  await save();
  expect(state.api.updateMarketingSidebar).not.toHaveBeenCalled();
  expect(host.textContent).toContain("Reservation lost");
});
