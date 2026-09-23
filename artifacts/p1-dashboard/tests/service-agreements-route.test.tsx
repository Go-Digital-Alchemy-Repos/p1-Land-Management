// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listServiceAgreements: vi.fn(),
  getServiceAgreement: vi.fn(),
  listAgreementRecurrences: vi.fn(),
  listAgreementEstimates: vi.fn(),
}));
vi.mock("@workspace/api-client-react/dashboard", () => api);
vi.mock("../src/AgreementDetail", () => ({
  AgreementDetail: ({ agreement }: { agreement: { title: string } }) => <p>Loaded {agreement.title}</p>,
}));
vi.mock("../src/AgreementQueue", () => ({ AgreementQueue: () => null }));
vi.mock("../src/AgreementPreparationQueue", () => ({ AgreementPreparationQueue: () => null }));
vi.mock("../src/AgreementEditor", () => ({ AgreementEditor: () => null }));
import { ServiceAgreements } from "../src/ServiceAgreements";

let host: HTMLDivElement;
let root: Root;
const agreementId = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.resetAllMocks();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  api.listServiceAgreements.mockResolvedValue({ items: [], nextCursor: null });
  api.listAgreementRecurrences.mockResolvedValue([]);
  api.listAgreementEstimates.mockResolvedValue([]);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

async function render(selectedAgreementId?: string) {
  await act(async () => {
    root.render(
      <ServiceAgreements
        role="member"
        capabilities={["revenue.agreements"]}
        properties={[]}
        selectedAgreementId={selectedAgreementId}
      />,
    );
    await Promise.resolve();
  });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

it("waits for an explicit retry after a failed agreement deep link", async () => {
  api.getServiceAgreement
    .mockRejectedValueOnce(new Error("Agreement unavailable"))
    .mockResolvedValue({ id: agreementId, title: "Synthetic agreement", status: "draft" });
  await render(agreementId);

  expect(api.getServiceAgreement).toHaveBeenCalledTimes(1);
  expect(host.textContent).toContain("Could not load this agreement: Agreement unavailable");
  expect(host.textContent).not.toContain("No service agreements have been recorded.");
  const retry = Array.from(host.querySelectorAll("button")).find(
    (button) => button.textContent === "Retry agreement details",
  );
  expect(retry).toBeTruthy();

  await act(async () => { await Promise.resolve(); });
  expect(api.getServiceAgreement).toHaveBeenCalledTimes(1);
  await act(async () => { retry?.click(); await Promise.resolve(); });
  expect(api.getServiceAgreement).toHaveBeenCalledTimes(2);
  expect(host.textContent).toContain("Loaded Synthetic agreement");
});

it("does not report an empty agreement portfolio when its list failed to load", async () => {
  api.listServiceAgreements.mockRejectedValueOnce(new Error("List unavailable"));
  await render();
  expect(host.textContent).toContain("List unavailable");
  expect(host.textContent).not.toContain("No service agreements have been recorded.");
});
