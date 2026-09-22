// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MapPin, LayoutDashboard } from "lucide-react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ClientWorkspace, WorkspaceTabs } from "../src/AccountWorkspace";

let host: HTMLDivElement;
let root: Root;
const accountId = "11111111-1111-4111-8111-111111111111";
const tabs = [
  { id: "overview" as const, label: "Overview", icon: LayoutDashboard, tone: "blue" as const },
  { id: "properties" as const, label: "Properties", icon: MapPin, tone: "green" as const },
];

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

it("exposes account sections as deep links with the current route announced", async () => {
  const onChange = vi.fn();
  await act(async () => root.render(<WorkspaceTabs tabs={tabs} active="properties" basePath={`/clients/${accountId}`} onChange={onChange} />));
  const nav = host.querySelector('nav[aria-label="Account sections"]');
  expect(nav).not.toBeNull();
  expect(nav?.querySelector('[role="tab"]')).toBeNull();
  expect(nav?.querySelector('a[href="/clients/' + accountId + '"]')).not.toBeNull();
  const properties = nav?.querySelector<HTMLAnchorElement>('a[href="/clients/' + accountId + '/properties"]');
  expect(properties?.getAttribute("aria-current")).toBe("page");
  await act(async () => properties?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
  expect(onChange).toHaveBeenCalledWith("properties");
});

it("leaves modified link activation to the browser", async () => {
  const onChange = vi.fn();
  await act(async () => root.render(<WorkspaceTabs tabs={tabs} active="overview" basePath={`/properties/${accountId}`} onChange={onChange} />));
  const properties = host.querySelector<HTMLAnchorElement>('a[href="/properties/' + accountId + '/properties"]');
  // Keep jsdom from attempting document navigation after the modified click.
  properties?.addEventListener("click", (event) => event.preventDefault());
  await act(async () => properties?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true })));
  expect(onChange).not.toHaveBeenCalled();
});

it("offers a client-scoped property choice to a request operator without full property access", async () => {
  const request = vi.fn().mockResolvedValue({
    client: { id: accountId, name: "Synthetic client", billing_address: null, phone: null, email: null },
    properties: [],
    propertyChoices: [{ id: "22222222-2222-4222-8222-222222222222", name: "Synthetic site" }],
    contacts: [], agreements: [], schedule: [], requests: [], projects: [], notes: [], activity: [], salesOrigins: [],
  });
  await act(async () => {
    root.render(<ClientWorkspace id={accountId} tab="requests" request={request} onTab={vi.fn()} onProperty={vi.fn()} role="member" capabilities={["customers.clients", "customers.requests"]} />);
    await Promise.resolve();
  });
  const create = Array.from(host.querySelectorAll("button")).find((button) => button.textContent?.includes("Create request"));
  await act(async () => create?.click());
  const choices = host.querySelectorAll<HTMLSelectElement>(".account-resource-form select option");
  expect(Array.from(choices).map((option) => option.textContent)).toContain("Synthetic site");
  expect(request).not.toHaveBeenCalledWith("/property-types");
});

it("does not report empty property or agreement portfolios to a restricted operator", async () => {
  const request = vi.fn().mockResolvedValue({
    client: { id: accountId, name: "Synthetic client", billing_address: null, phone: null, email: null },
    properties: [], propertyChoices: [], contacts: [], agreements: [], schedule: [], requests: [], projects: [],
    notes: [], activity: [], salesOrigins: [],
  });
  await act(async () => {
    root.render(<ClientWorkspace id={accountId} tab="overview" request={request} onTab={vi.fn()} onProperty={vi.fn()} role="member" capabilities={["customers.clients", "customers.requests"]} />);
    await Promise.resolve();
  });
  expect(host.textContent).not.toContain("No properties yet");
  expect(host.textContent).not.toContain("No active agreements");
  expect(host.textContent).not.toContain("No work on the calendar");
});
