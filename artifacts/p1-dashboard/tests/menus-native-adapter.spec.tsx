import {
  indentMenuItem,
  outdentMenuItem,
} from "../../../platform/p1-core/client/src/components/shared/menu-tree-operations";
// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import CmsMenus from "../src/marketing/CmsMenus";
const state = vi.hoisted(() => ({
  transport: vi.fn(),
  api: Object.fromEntries(
    [
      "listWebsiteMenus",
      "getWebsiteMenuReferences",
      "getWebsiteMenu",
      "createWebsiteMenu",
      "updateWebsiteMenu",
      "deleteWebsiteMenu",
      "acquireWebsiteMenuReservation",
      "heartbeatWebsiteMenuReservation",
      "releaseWebsiteMenuReservation",
    ].map((name) => [name, vi.fn()]),
  ),
}));
vi.mock("@workspace/api-client-react/dashboard", () => state.api);
vi.mock("../../../lib/api-client-react/src/custom-fetch", () => ({
  customFetch: state.transport,
}));
const menu = {
  id: "menu-one",
  name: "Main Menu",
  location: "main_navigation",
  version: 3,
  items: [],
};
let root: Root, container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  state.api.listWebsiteMenus.mockResolvedValue([menu]);
  state.api.getWebsiteMenu.mockResolvedValue(menu);
  state.api.getWebsiteMenuReferences.mockResolvedValue({
    pages: [],
    forms: [],
  });
  for (const key of [
    "acquireWebsiteMenuReservation",
    "heartbeatWebsiteMenuReservation",
    "releaseWebsiteMenuReservation",
  ])
    state.api[key].mockResolvedValue({ ownedByCurrentUser: true, lock: null });
  state.transport.mockRejectedValue(
    Error("Menu changed. Reload before saving."),
  );
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});
it("sends the opened menu version and retains the draft after a stale rejection", async () => {
  await act(async () => root.render(<CmsMenus />));
  const edit = Array.from(container.querySelectorAll("button")).find(
    (x) => x.textContent === "Edit Main Menu",
  )!;
  await act(async () => edit.click());
  const input = container.querySelector<HTMLInputElement>("form input")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "Changed menu");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () =>
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(state.transport).toHaveBeenCalled();
  const write = state.transport.mock.calls.find(
    (call) => call[1].method === "PUT",
  )!;
  expect(JSON.parse(write[1].body)).toMatchObject({
    expectedVersion: 3,
    name: "Changed menu",
  });
  expect(input.value).toBe("Changed menu");
  expect(container.textContent).toContain(
    "Menu changed. Reload before saving.",
  );
});

const item = (id: string, children: any[] = []) => ({
  id,
  label: id,
  url: "/" + id,
  openInNewTab: false,
  action: "custom-link" as const,
  children,
  future: { id },
});
it("indents and outdents one level within a three-level tree without changing input or unknown fields", () => {
  const original = [item("a", [item("b"), item("c")]), item("d")];
  const frozen = JSON.parse(JSON.stringify(original));
  const nested = indentMenuItem(original, "c");
  expect(nested[0].children[0].children[0]).toEqual(item("c"));
  expect(original).toEqual(frozen);
  const lifted = outdentMenuItem(nested, "c");
  expect(lifted).toEqual(original);
  const root = outdentMenuItem(lifted, "c");
  expect(root.map((x) => x.id)).toEqual(["a", "c", "d"]);
  expect((root[1] as any).future).toEqual({ id: "c" });
  const tooDeep = [item("a"), item("b", [item("c", [item("d")])])];
  expect(indentMenuItem(tooDeep, "b")).toEqual(tooDeep);
});
it("restores theme assignments, legacy indicators, compact nested controls and lossless saves", async () => {
  const fixture = {
    ...menu,
    items: [item("a", [item("b"), item("c")]), item("d")],
  };
  state.api.listWebsiteMenus.mockResolvedValue([
    fixture,
    { ...menu, id: "legacy", name: "Legacy Footer", location: "footer" },
  ]);
  state.api.getWebsiteMenu.mockResolvedValue(fixture);
  await act(async () => root.render(<CmsMenus />));
  expect(container.textContent).toContain("Theme Locations");
  expect(container.textContent).toContain("Legacy Footer (legacy footer menu)");
  await act(async () => {
    container
      .querySelector<HTMLButtonElement>('[aria-label="Edit Main Menu"]')!
      .click();
  });
  const row = container.querySelector('[data-testid="menu-item-c"]')!;
  const indent = Array.from(row.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === "Indent",
  )!;
  await act(async () => indent.click());
  expect(
    container.querySelector(
      '[data-testid="menu-item-b"] [data-testid="menu-item-c"]',
    ),
  ).not.toBeNull();
  await act(async () =>
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  const write = state.transport.mock.calls.find(
    (call) => call[1].method === "PUT",
  )!;
  const payload = JSON.parse(write[1].body);
  expect(payload.expectedVersion).toBe(3);
  expect(payload.items[0].future).toEqual({ id: "a" });
  expect(payload.items[0].children[0].children[0].future).toEqual({ id: "c" });
});
it("blocks replay after an unconfirmed create until saved menus are reloaded and explicitly reviewed", async () => {
  state.api.createWebsiteMenu.mockRejectedValue(Error("Response lost"));
  await act(async () => root.render(<CmsMenus />));
  await act(async () => {
    Array.from(container.querySelectorAll("button"))
      .find((b) => b.textContent === "Create menu")!
      .click();
  });
  const name = container.querySelector<HTMLInputElement>("form input")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(name, "New draft");
    name.dispatchEvent(new Event("input", { bubbles: true }));
  });
  const submit = () =>
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  await act(async () => {
    submit();
  });
  expect(state.api.createWebsiteMenu).toHaveBeenCalledTimes(1);
  await act(async () => {
    submit();
  });
  expect(state.api.createWebsiteMenu).toHaveBeenCalledTimes(1);
  expect(name.value).toBe("New draft");
  expect(container.textContent).toContain("creation could not be confirmed");
  await act(async () => {
    Array.from(container.querySelectorAll("button"))
      .find((b) => b.textContent === "Reload saved menus")!
      .click();
  });
  await act(async () => {
    submit();
  });
  expect(state.api.createWebsiteMenu).toHaveBeenCalledTimes(1);
  await act(async () => {
    Array.from(container.querySelectorAll("button"))
      .find((b) => b.textContent?.includes("allow a new create request"))!
      .click();
  });
  await act(async () => {
    submit();
  });
  expect(state.api.createWebsiteMenu).toHaveBeenCalledTimes(2);
});
