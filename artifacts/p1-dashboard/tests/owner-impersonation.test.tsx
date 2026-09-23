// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { OwnerImpersonation } from "../src/OwnerImpersonation";

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  HTMLDialogElement.prototype.showModal = vi.fn();
  HTMLDialogElement.prototype.close = vi.fn();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

it("offers the Owner six seeded role choices and names the real-write boundary", async () => {
  const request = vi.fn().mockResolvedValueOnce({ items: [] })
    .mockResolvedValueOnce({ items: [] }).mockResolvedValueOnce({ items: [
      { id: "sales-1", name: "Livia Marsh · Demo sales", email: "p1-demo-sales@example.test", role: "sales", demo: true },
    ] });
  await act(async () => root.render(<OwnerImpersonation name="Mike" role="owner" request={request} />));
  await act(async () => { host.querySelector<HTMLButtonElement>(".impersonation-trigger")?.click(); await Promise.resolve(); });
  expect(host.textContent).toContain("Changes can affect live records");
  expect(host.querySelector("dialog[aria-labelledby='impersonation-title']")).not.toBeNull();
  expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  await act(async () => {
    Array.from(host.querySelectorAll("button")).find((button) => button.textContent === "Create six demo user types")?.click();
    await Promise.resolve();
  });
  expect(request).toHaveBeenCalledWith("/impersonation/demo-personas", {});
  expect(host.textContent).toContain("Livia Marsh · Demo sales");
  expect(host.textContent).toContain("p1-demo-sales@example.test");
});

it("makes impersonation visible and offers an immediate Owner exit", async () => {
  const request = vi.fn(async () => ({ items: [] }));
  await act(async () => root.render(<OwnerImpersonation name="Clara Grove" role="client"
    active={{ ownerId: "owner-1", ownerName: "Mike", demo: true, expiresAt: "2030-01-01T00:00:00Z" }}
    request={request} />));
  expect(host.querySelector(".impersonation-banner")?.textContent).toContain("Acting as Clara Grove");
  expect(host.querySelector(".impersonation-banner")?.textContent).toContain("Changes are real and audited");
  expect(Array.from(host.querySelectorAll("button")).some((button) => button.textContent === "Return to Owner")).toBe(true);
});

it("never offers the switcher to an ordinary account", async () => {
  await act(async () => root.render(<OwnerImpersonation name="Staff" role="sales" request={vi.fn()} />));
  expect(host.textContent).toBe("");
});
