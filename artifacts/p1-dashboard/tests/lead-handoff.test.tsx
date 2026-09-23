// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  getLeadOnboarding: vi.fn(),
  getWorkspaceReferences: vi.fn(),
  onboardLeadCustomer: vi.fn(),
}));
vi.mock("@workspace/api-client-react/dashboard", () => api);
vi.mock("../src/marketing/useCmsUnsavedChanges", () => ({ useCmsUnsavedChanges: () => {} }));
import { LeadOnboarding } from "../src/LeadOnboarding";

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.resetAllMocks();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  api.getLeadOnboarding.mockResolvedValue({ version: 1, status: "won", clientId: null, clientName: null, clientArchived: false });
  api.getWorkspaceReferences.mockResolvedValue({ clients: [{ id: "22222222-2222-4222-8222-222222222222", name: "P1 QA" }] });
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

it("prefills a new customer for review and offers a matching existing account", async () => {
  await act(async () => root.render(<LeadOnboarding leadId="11111111-1111-4111-8111-111111111111" suggestedCustomer={{ name: "P1 QA", email: "qa@example.test", phone: null }} />));
  await act(async () => host.querySelector<HTMLButtonElement>(".lead-onboarding > button")?.click());
  await act(async () => { await Promise.resolve(); });
  const choice = host.querySelector<HTMLSelectElement>('label select');
  expect(choice).not.toBeNull();
  await act(async () => {
    if (choice) { choice.value = "create"; choice.dispatchEvent(new Event("change", { bubbles: true })); }
  });
  expect(host.querySelector<HTMLInputElement>('input[maxlength="300"]')?.value).toBe("P1 QA");
  expect(host.querySelector<HTMLInputElement>('input[type="email"]')?.value).toBe("qa@example.test");
  expect(host.textContent).toContain("A customer with this name already exists.");
  await act(async () => host.querySelector<HTMLButtonElement>(".lead-onboarding-matches button")?.click());
  expect(choice?.value).toBe("link");
  expect(host.querySelectorAll("select")[1]?.value).toBe("22222222-2222-4222-8222-222222222222");
});

it("requires a visible handoff review before linking an existing customer", async () => {
  api.onboardLeadCustomer.mockResolvedValue({ clientId: "22222222-2222-4222-8222-222222222222", version: 2 });
  await act(async () => root.render(<LeadOnboarding leadId="11111111-1111-4111-8111-111111111111" />));
  await act(async () => host.querySelector<HTMLButtonElement>(".lead-onboarding > button")?.click());
  await act(async () => { await Promise.resolve(); });
  const customer = host.querySelectorAll<HTMLSelectElement>("select")[1];
  await act(async () => {
    customer.value = "22222222-2222-4222-8222-222222222222";
    customer.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const form = host.querySelector("form");
  await act(async () => { form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
  expect(api.onboardLeadCustomer).not.toHaveBeenCalled();
  expect(host.querySelector('[aria-label="Review customer handoff"]')?.textContent).toContain("P1 QA");
  expect(host.textContent).toContain("Confirm customer link");
  await act(async () => { form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
  expect(api.onboardLeadCustomer).toHaveBeenCalledTimes(1);
  expect(api.onboardLeadCustomer.mock.calls[0][1].customer).toEqual({ existingId: "22222222-2222-4222-8222-222222222222" });
});
