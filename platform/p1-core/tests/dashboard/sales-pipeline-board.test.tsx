import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listSalesInquiries: vi.fn(),
  getSalesPipelineSettings: vi.fn(),
  saveSalesPipelineSettings: vi.fn(),
}));

vi.mock("@workspace/api-client-react/dashboard", () => api);

import { SalesPipelineBoard } from "../../../../artifacts/p1-dashboard/src/SalesPipelineBoard";

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.resetAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  api.listSalesInquiries.mockImplementation(async ({ status, cursor }: any) => ({
    items:
      status === "new" && !cursor
        ? [
            {
              id: "11111111-1111-4111-8111-111111111111",
              name: "North Site",
              reported_company_name: "P1 Test",
              location: "Union County",
              status: "new",
              owner_id: null,
              owner_name: null,
              next_action: "Call prospect",
              next_action_due_at: null,
            },
          ]
        : [],
    nextCursor: null,
  }));
});

afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

it("groups the existing Sales inquiries by all six persisted lifecycle stages", async () => {
  const create = vi.fn();
  await act(async () => {
    root.render(<SalesPipelineBoard canOnboard onCreate={create} />);
    await Promise.resolve();
  });
  expect(api.listSalesInquiries).toHaveBeenCalledTimes(6);
  expect(api.listSalesInquiries.mock.calls.map(([query]: any[]) => query.status)).toEqual([
    "new",
    "contacted",
    "qualified",
    "proposal",
    "won",
    "lost",
  ]);
  expect(host.querySelector('[aria-label="New inquiries"]')?.textContent).toContain("North Site");
  expect(host.querySelector('[aria-label="Won inquiries"]')?.textContent).toContain("No inquiries in this stage.");
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click());
  expect(create).toHaveBeenCalledOnce();
});
