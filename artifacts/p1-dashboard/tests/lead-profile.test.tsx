// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getLeadDetails: vi.fn(),
  getLeadFollowUp: vi.fn(),
  getCommercialInquiry: vi.fn(),
  listAgreementDrafts: vi.fn(),
}));
vi.mock("@workspace/api-client-react/dashboard", () => api);
vi.mock("../src/PipelineSettings", () => ({ PipelineStage: ({ value }: { value: string }) => <span>{value}</span> }));
vi.mock("../src/CommercialAssessmentPanel", () => ({ CommercialAssessmentPanel: () => <div>Assessment workspace</div> }));
vi.mock("../src/CommercialContextPanel", () => ({ CommercialContextPanel: () => <div>Prospect context</div> }));
vi.mock("../src/LeadDetails", () => ({ LeadDetails: () => <div>Details editor</div> }));
vi.mock("../src/LeadFollowUp", () => ({ LeadFollowUp: () => <div>Follow-up editor</div> }));
vi.mock("../src/LeadOnboarding", () => ({ LeadOnboarding: () => <div>Reviewed handoff</div> }));
vi.mock("../src/LeadNotes", () => ({ LeadNotes: () => <div>Notes</div> }));
vi.mock("../src/CrmTasks", () => ({ CrmTasks: () => <div>Tasks</div> }));
vi.mock("../src/CrmArchive", () => ({ CrmArchive: () => <div>Archive</div> }));

import { LeadProfile } from "../src/LeadProfile";

const id = "11111111-1111-4111-8111-111111111111";
const clientId = "22222222-2222-4222-8222-222222222222";
let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.resetAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  api.getLeadDetails.mockResolvedValue({ id, version: 3, name: "Test Lead", email: null, phone: null, location: "Synthetic region", description: "Site care request", reported_company_name: "Internal QA", submittedContext: { reported_property_name: "Test site", property_type: "Commercial", acreage_description: "10 acres", services: ["Grounds care"], service_timing: "Soon" } });
  api.getLeadFollowUp.mockResolvedValue({ lead: { id, name: "Test Lead", status: "won", owner_id: "owner-1", next_action: "Prepare client handoff", next_action_due_at: null, last_activity_at: null, version: 3, converted_client_id: clientId, converted_property_id: null }, owners: [{ id: "owner-1", name: "QA Owner" }] });
  api.listAgreementDrafts.mockResolvedValue({ items: [{ id: "33333333-3333-4333-8333-333333333333", title: "Grounds agreement", status: "draft" }], nextCursor: null });
  api.getCommercialInquiry.mockRejectedValue({ status: 404 });
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

it("keeps the inquiry readable and links its client and agreement without opening forms", async () => {
  const onTab = vi.fn();
  await act(async () => { root.render(<LeadProfile id={id} tab="overview" canOnboard onTab={onTab} />); await Promise.resolve(); });
  expect(host.querySelector("h1")?.textContent).toBe("Test Lead");
  expect(host.textContent).toContain("Prepare client handoff");
  expect(host.textContent).toContain("QA Owner");
  expect(host.querySelector(`a[href="/clients/${clientId}"]`)).not.toBeNull();
  expect(host.querySelector(`a[href="/agreements/drafts/33333333-3333-4333-8333-333333333333"]`)).not.toBeNull();
  expect(host.textContent).not.toContain("Follow-up editor");
  await act(async () => host.querySelector<HTMLButtonElement>(".lead-profile-surface-heading button")?.click());
  expect(onTab).toHaveBeenCalledWith("follow-up");
});

it("does not offer customer handoff or client navigation without the customer grant", async () => {
  await act(async () => { root.render(<LeadProfile id={id} tab="overview" canOnboard={false} onTab={vi.fn()} />); await Promise.resolve(); });
  expect(host.querySelector(`a[href="/clients/${clientId}"]`)).toBeNull();
  expect(host.querySelector('a[href$="/handoff"]')).toBeNull();
  expect(host.textContent).toContain("Client linked");
});

it("keeps a failed refresh from exposing stale editable profile sections", async () => {
  await act(async () => { root.render(<LeadProfile id={id} tab="overview" canOnboard onTab={vi.fn()} />); await Promise.resolve(); });
  api.getLeadDetails.mockRejectedValueOnce({ status: 503 });
  await act(async () => { root.render(<LeadProfile id={"44444444-4444-4444-8444-444444444444"} tab="overview" canOnboard onTab={vi.fn()} />); await Promise.resolve(); });
  expect(host.querySelector(".lead-profile-error")).not.toBeNull();
  expect(host.querySelector(".lead-profile-header")).toBeNull();
  expect(host.textContent).toContain("Could not load this inquiry");
});

it("does not mistake a failed assessment check for an absent assessment", async () => {
  api.getCommercialInquiry.mockRejectedValue({ status: 503 });
  await act(async () => { root.render(<LeadProfile id={id} tab="assessment" canOnboard onTab={vi.fn()} />); await Promise.resolve(); });
  expect(host.textContent).toContain("Assessment unavailable");
  expect(host.textContent).not.toContain("No commercial assessment is associated");
  expect(host.querySelector('a[href$="/assessment"]')).not.toBeNull();
});
