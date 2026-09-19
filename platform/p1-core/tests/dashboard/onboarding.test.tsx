import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const state = vi.hoisted(() => ({
  plan: vi.fn(),
  dns: vi.fn(),
  readiness: vi.fn(),
  evidence: vi.fn(),
}));
vi.mock("@workspace/api-client-react/dashboard", () => ({
  createOnboardingPlan: state.plan,
  verifyOnboardingDns: state.dns,
  evaluateOnboardingReadiness: state.readiness,
  getOnboardingEvidence: state.evidence,
}));
import Onboarding from "../../../../artifacts/p1-dashboard/src/marketing/ClientStackOnboarding";
let host: HTMLDivElement, root: Root;
const plan = {
  stackId: "p1",
  publicOrigin: "https://www.example.com",
  adminOrigin: "https://dashboard.example.com",
  records: [{ fqdn: "example.com", type: "A", value: "192.0.2.1", ttl: 300, purpose: "Apex" }],
  manualInstructions: ["Record DNS"],
  rollbackInstructions: ["Preserve old values"],
  requiredVerification: ["HTTPS"],
  evidence: { id: "receipt", recordedAt: "2026-09-19T00:00:00Z" },
};
beforeEach(() => {
  vi.clearAllMocks();
  state.plan.mockResolvedValue(plan);
  state.evidence.mockResolvedValue([]);
  state.dns.mockResolvedValue({ status: "ready", records: [], evidence: plan.evidence });
  state.readiness.mockResolvedValue({
    status: "pending",
    passed: [],
    pending: ["HTTPS"],
    failed: [],
    evidence: plan.evidence,
  });
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});
async function render() {
  await act(async () => root.render(<Onboarding />));
}
async function submit(index: number) {
  await act(async () =>
    host
      .querySelectorAll("form")
      [index].dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}
async function click(name: string) {
  await act(async () =>
    [...host.querySelectorAll("button")].find((e) => e.textContent === name)!.click(),
  );
}
it("can read saved evidence without creating any plan or changing DNS", async () => {
  await render();
  await submit(1);
  expect(state.evidence).toHaveBeenCalled();
  expect(state.plan).not.toHaveBeenCalled();
  expect(state.dns).not.toHaveBeenCalled();
  expect(host.textContent).toContain("No evidence recorded");
});
it("projects generated records to the strict DNS request and starts readiness pending", async () => {
  await render();
  await submit(0);
  expect(host.textContent).toContain("Preserve old values");
  await click("Verify and record published DNS");
  expect(state.dns.mock.calls[0][0]).toEqual({
    stackId: "p1",
    records: [{ fqdn: "example.com", type: "A", value: "192.0.2.1" }],
  });
  await click("Evaluate and record readiness");
  expect(Object.values(state.readiness.mock.calls[0][0].checks)).toEqual(Array(9).fill("pending"));
});
it("does not automatically replay uncertain writes or discard the last plan", async () => {
  await render();
  await submit(0);
  state.plan.mockRejectedValueOnce(new Error("Unavailable"));
  await submit(0);
  expect(state.plan).toHaveBeenCalledTimes(2);
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("inspect saved evidence");
  expect(host.textContent).toContain("Plan for p1");
});
