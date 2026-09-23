// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MapPin, LayoutDashboard } from "lucide-react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ClientWorkspace, PropertyWorkspace, WorkspaceTabs, isOpenRequestStatus, upcomingWork } from "../src/AccountWorkspace";

vi.mock("../src/PropertyMap", () => ({
  PropertyLocationMap: () => <div data-testid="synthetic-property-map" />,
  PropertyMap: () => <div data-testid="synthetic-property-map" />,
}));

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

it("counts only future scheduled work and includes client-facing open request statuses", () => {
  const work = [
    { id: "past", status: "scheduled", scheduled_at: "2000-01-01T12:00:00.000Z" },
    { id: "completed", status: "completed", scheduled_at: "2099-01-01T12:00:00.000Z" },
    { id: "future", status: "scheduled", scheduled_at: "2099-01-01T12:00:00.000Z" },
    { id: "undated", status: "scheduled", scheduled_at: null },
  ];
  expect(upcomingWork(work, Date.parse("2026-09-22T12:00:00.000Z")).map((item) => item.id)).toEqual(["future"]);
  expect(["new", "triaged", "received", "under_review", "service_planning", "work_planning"].every(isOpenRequestStatus)).toBe(true);
  expect(isOpenRequestStatus("closed")).toBe(false);
  expect(isOpenRequestStatus("cancelled")).toBe(false);
  expect(isOpenRequestStatus("converted")).toBe(false);
});

it("keeps completed and past visits out of the client account's upcoming summary", async () => {
  const request = vi.fn().mockResolvedValue({
    client: { id: accountId, name: "Synthetic client", billing_address: null, phone: null, email: null },
    properties: [], propertyChoices: [], contacts: [], agreements: [],
    schedule: [
      { id: "past", title: "Past visit", status: "scheduled", scheduled_at: "2000-01-01T12:00:00.000Z" },
      { id: "done", title: "Completed visit", status: "completed", scheduled_at: "2099-01-01T12:00:00.000Z" },
      { id: "next", title: "Next visit", status: "scheduled", scheduled_at: "2099-01-01T12:00:00.000Z" },
    ],
    requests: [
      { id: "new", status: "new" },
      { id: "review", status: "triaged" },
      { id: "converted", status: "converted" },
      { id: "closed", status: "closed" },
    ], projects: [], notes: [], activity: [], salesOrigins: [],
  });
  await act(async () => {
    root.render(<ClientWorkspace id={accountId} tab="overview" request={request} onTab={vi.fn()} onProperty={vi.fn()} role="owner" capabilities={[]} />);
    await Promise.resolve();
  });
  expect(host.textContent).toContain("Next visit");
  expect(host.textContent).not.toContain("Past visit");
  expect(host.textContent).not.toContain("Completed visit");
  const attention = Array.from(host.querySelectorAll(".atlas-stat")).find((item) => item.textContent?.includes("Needs attention"));
  expect(attention?.querySelector("strong")?.textContent).toBe("2");
});

it("shows client-facing received requests in the property open-request count", async () => {
  const request = vi.fn().mockResolvedValue({
    property: { id: accountId, name: "Synthetic site", address: "Test road", client_name: "Synthetic client", acreage: null },
    schedule: [], agreements: [], requests: [
      { id: "received", status: "received", description: "Drainage" },
      { id: "planning", status: "work_planning", description: "Landscape" },
      { id: "closed", status: "closed", description: "Resolved" },
    ],
    projects: [], inspections: [], files: [], contacts: [], notes: [],
  });
  await act(async () => {
    root.render(<PropertyWorkspace id={accountId} tab="overview" request={request} onTab={vi.fn()} onClient={vi.fn()} canOpenClient={false} role="client" />);
    await Promise.resolve();
  });
  const requests = Array.from(host.querySelectorAll(".atlas-stat")).find((item) => item.textContent?.includes("Open requests"));
  expect(requests?.querySelector("strong")?.textContent).toBe("2");
});
