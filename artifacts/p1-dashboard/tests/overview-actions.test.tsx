// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NeedsYouList, OverviewMetrics } from "../src/OverviewActions";
import { ToastRegion } from "../src/ToastRegion";

let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

it("opens each metric destination with its URL filter and keyboard-visible link", async () => {
  const navigate = vi.fn();
  await act(async () => root.render(<OverviewMetrics onNavigate={navigate} items={[
    { label: "Finished, needs review", value: 7, detail: "Ready for office review", href: "/schedule?status=completed" },
    { label: "Service requests", value: 2, detail: "Follow up", href: "/requests?status=new" },
  ]} />));
  const links = Array.from(host.querySelectorAll<HTMLAnchorElement>("a.metric"));
  expect(links.map((link) => link.getAttribute("href"))).toEqual(["/schedule?status=completed", "/requests?status=new"]);
  expect(links[0].getAttribute("aria-label")).toContain("7. Open list");
  await act(async () => links[0].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  expect(navigate).toHaveBeenCalledWith("/schedule?status=completed");
});

it("shows role-scoped priorities, one action per row, and an empty state", async () => {
  const navigate = vi.fn();
  await act(async () => root.render(<NeedsYouList items={[{ kind: "completed-work", count: 3, href: "/schedule?status=completed" }]} loading={false} error={false} onNavigate={navigate} />));
  expect(host.textContent).toContain("3 finished jobs are waiting for your review");
  expect(host.querySelectorAll("li a")).toHaveLength(1);
  await act(async () => root.render(<NeedsYouList items={[]} loading={false} error={false} onNavigate={navigate} />));
  expect(host.textContent).toContain("You're caught up. Nothing needs you right now.");
});

it("announces success and errors through persistent live regions", async () => {
  await act(async () => root.render(<ToastRegion notice="Saved" error="" />));
  expect(host.querySelector('[role="status"]')?.textContent).toContain("Saved");
  await act(async () => root.render(<ToastRegion notice="Saved" error="Upload failed" />));
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("Upload failed");
});
