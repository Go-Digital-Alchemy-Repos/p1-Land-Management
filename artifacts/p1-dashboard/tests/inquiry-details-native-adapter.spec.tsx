import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const api = vi.hoisted(() => ({ getLeadDetails: vi.fn(), updateLeadDetails: vi.fn(), getLeadDetailHistory: vi.fn() }));
vi.mock("@workspace/api-client-react/dashboard", () => api);
import { LeadDetails } from "../src/LeadDetails";
let host: HTMLDivElement, root: Root;
const details = { id: "fixture", version: 1, name: "Test contact", email: null, phone: null, location: "Test site", description: "Test scope", reported_company_name: null };
beforeEach(() => {
  vi.resetAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  api.getLeadDetailHistory.mockResolvedValue({ items: [], nextBeforeVersion: null });
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
async function open() {
  await act(async () => root.render(<LeadDetails leadId="fixture" />));
  await act(async () => host.querySelector("button")!.click());
}
it("shows reported project fields as text without interpreting markup or turning them into correction inputs", async () => {
  api.getLeadDetails.mockResolvedValue({ ...details, submittedContext: { contact_title: "Facilities", reported_property_name: "<img src=x onerror=alert(1)>", property_type: "Industrial", acreage_description: "45 acres", project_stage: "Operating", service_timing: "Monthly", services: ["Drainage", "Vegetation"] } });
  await open();
  const panel = host.querySelector('[aria-label="Submitted property and project details"]')!;
  expect(panel.textContent).toContain("45 acres");
  expect(panel.textContent).toContain("Drainage, Vegetation");
  expect(panel.textContent).toContain("<img src=x onerror=alert(1)>");
  expect(panel.querySelector("img,input,textarea")).toBeNull();
});
it("keeps the existing editor usable when an older API omits context", async () => {
  api.getLeadDetails.mockResolvedValue(details);
  await open();
  expect(host.querySelector('[aria-label="Contact name"]')).not.toBeNull();
  expect(host.querySelector('[aria-label="Submitted property and project details"]')).toBeNull();
});
