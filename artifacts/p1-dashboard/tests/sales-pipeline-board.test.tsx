// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({
  listSalesInquiries: vi.fn(),
  getSalesPipelineSettings: vi.fn(),
  saveSalesPipelineSettings: vi.fn(),
}));

vi.mock("@workspace/api-client-react/dashboard", () => api);

import { SalesPipelineBoard } from "../src/SalesPipelineBoard";

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.resetAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  api.listSalesInquiries.mockImplementation(
    async ({ status, cursor }: any) => ({
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
    }),
  );
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
  expect(
    api.listSalesInquiries.mock.calls.map(([query]: any[]) => query.status),
  ).toEqual(["new", "contacted", "qualified", "proposal", "won", "lost"]);
  expect(
    host.querySelector('[aria-label="New inquiries"]')?.textContent,
  ).toContain("North Site");
  expect(
    host.querySelector('[aria-label="Won inquiries"]')?.textContent,
  ).toContain("No inquiries in this stage.");
  expect(
    [...host.querySelectorAll(".sales-pipeline-column h3")].map((heading) =>
      heading.textContent?.replace(/\s+\d+$/, ""),
    ),
  ).toEqual(["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"]);
  await act(async () =>
    host.querySelector<HTMLButtonElement>("button")!.click(),
  );
  expect(create).toHaveBeenCalledOnce();
});

it("retries a failed refresh and appends the next page without duplicating a card", async () => {
  let refreshes = 0;
  api.listSalesInquiries.mockImplementation(async ({ status, cursor }: any) => {
    if (status !== "new") return { items: [], nextCursor: null };
    if (refreshes === 0) throw new Error("temporary failure");
    if (!cursor)
      return {
        items: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "North Site",
            reported_company_name: "P1 Test",
            location: "Union County",
            status: "new",
            owner_id: null,
            owner_name: null,
            next_action: null,
            next_action_due_at: null,
          },
        ],
        nextCursor: "next-new-page",
      };
    return {
      items: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          name: "South Site",
          reported_company_name: "P1 Test",
          location: "York County",
          status: "new",
          owner_id: null,
          owner_name: null,
          next_action: null,
          next_action_due_at: null,
        },
      ],
      nextCursor: null,
    };
  });
  const create = vi.fn();
  await act(async () => {
    root.render(<SalesPipelineBoard canOnboard onCreate={create} />);
    await Promise.resolve();
  });
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    "Could not load",
  );
  refreshes = 1;
  await act(async () => {
    host.querySelector<HTMLButtonElement>("button:nth-of-type(2)")!.click();
    await Promise.resolve();
  });
  const more = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) => button.textContent === "Load older inquiries",
  );
  expect(more).toBeTruthy();
  await act(async () => {
    more!.click();
    await Promise.resolve();
  });
  const column = host.querySelector('[aria-label="New inquiries"]');
  expect(column?.textContent).toContain("North Site");
  expect(column?.textContent).toContain("South Site");
  expect(column?.querySelectorAll(".sales-pipeline-card")).toHaveLength(2);
});
