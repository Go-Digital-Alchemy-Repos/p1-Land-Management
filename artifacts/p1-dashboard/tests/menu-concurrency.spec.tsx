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
