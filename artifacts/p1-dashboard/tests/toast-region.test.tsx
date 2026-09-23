// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { ToastRegion } from "../src/ToastRegion";

let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

it("announces success politely and errors assertively from one shell region", async () => {
  await act(async () => root.render(<ToastRegion notice="Saved" error="" />));
  expect(host.querySelector('[role="status"]')?.textContent).toContain("Saved");
  expect(host.querySelectorAll('[role="status"]')).toHaveLength(1);
  await act(async () => root.render(<ToastRegion notice="Saved" error="Could not save" />));
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("Could not save");
  expect(host.querySelectorAll('[role="alert"]')).toHaveLength(1);
});
