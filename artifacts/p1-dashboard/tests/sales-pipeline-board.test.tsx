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
import { PipelineProvider } from "../src/PipelineSettings";

let host: HTMLDivElement;
let root: Root;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, resolve, reject };
}

const emptyPage = { items: [], nextCursor: null };

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
  const open = vi.fn();
  await act(async () => {
    root.render(<SalesPipelineBoard onCreate={create} onOpen={open} />);
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
  const link = host.querySelector<HTMLAnchorElement>('.sales-pipeline-card-link');
  expect(link?.getAttribute('href')).toBe('/sales/leads/11111111-1111-4111-8111-111111111111');
  await act(async () => link?.click());
  expect(open).toHaveBeenCalledWith('11111111-1111-4111-8111-111111111111');
  expect(host.textContent).not.toContain('Open inquiry workspace');
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
    root.render(<SalesPipelineBoard onCreate={create} onOpen={vi.fn()} />);
    await Promise.resolve();
  });
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    "Could not load",
  );
  expect(host.textContent).toContain("Pipeline unavailable. Retry to refresh.");
  expect(host.textContent).not.toContain("No inquiries in this stage.");
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

it("keeps a refreshed pipeline when an older page resolves after its request was cancelled", async () => {
  const staleMore = deferred<any>();
  let newPage = 0;
  api.listSalesInquiries.mockImplementation(({ status, cursor }: any) => {
    if (status !== "new") return Promise.resolve(emptyPage);
    if (cursor === "first-page") return staleMore.promise;
    newPage++;
    return Promise.resolve(
      newPage === 1
        ? {
            items: [
              {
                id: "11111111-1111-4111-8111-111111111111",
                name: "Before refresh",
                status: "new",
              },
            ],
            nextCursor: "first-page",
          }
        : {
            items: [
              {
                id: "22222222-2222-4222-8222-222222222222",
                name: "After refresh",
                status: "new",
              },
            ],
            nextCursor: null,
          },
    );
  });
  await act(async () => {
    root.render(<SalesPipelineBoard onCreate={vi.fn()} onOpen={vi.fn()} />);
    await Promise.resolve();
  });
  const older = [...host.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) => button.textContent === "Load older inquiries",
  );
  await act(async () => {
    older!.click();
    await Promise.resolve();
  });
  await act(async () => {
    [...host.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Refresh pipeline")!
      .click();
    await Promise.resolve();
  });
  staleMore.resolve({
    items: [
      {
        id: "33333333-3333-4333-8333-333333333333",
        name: "Stale older inquiry",
        status: "new",
      },
    ],
    nextCursor: "stale-cursor",
  });
  await act(async () => {
    await staleMore.promise;
  });
  const column = host.querySelector('[aria-label="New inquiries"]');
  expect(column?.textContent).toContain("After refresh");
  expect(column?.textContent).not.toContain("Before refresh");
  expect(column?.textContent).not.toContain("Stale older inquiry");
  expect(column?.textContent).not.toContain("Load older inquiries");
  expect(host.querySelector('[role="alert"]')).toBeNull();
});

it("aborts an in-flight older page on unmount without rendering its late response", async () => {
  const staleMore = deferred<any>();
  let moreSignal: AbortSignal | undefined;
  api.listSalesInquiries.mockImplementation(
    ({ status, cursor }: any, options?: { signal?: AbortSignal }) => {
      if (status !== "new") return Promise.resolve(emptyPage);
      if (cursor) {
        moreSignal = options?.signal;
        return staleMore.promise;
      }
      return Promise.resolve({
        items: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            name: "North Site",
            status: "new",
          },
        ],
        nextCursor: "older-page",
      });
    },
  );
  await act(async () => {
    root.render(<SalesPipelineBoard onCreate={vi.fn()} onOpen={vi.fn()} />);
    await Promise.resolve();
  });
  await act(async () => {
    [...host.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent === "Load older inquiries")!
      .click();
    await Promise.resolve();
  });
  expect(moreSignal?.aborted).toBe(false);
  await act(async () => root.unmount());
  expect(moreSignal?.aborted).toBe(true);
  staleMore.resolve({
    items: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Late inquiry",
        status: "new",
      },
    ],
    nextCursor: null,
  });
  await act(async () => {
    await staleMore.promise;
  });
  expect(host.textContent).toBe("");
});

it("uses the Owner-configured stage order, labels, and colors", async () => {
  api.getSalesPipelineSettings.mockResolvedValue({
    revision: 1,
    config: {
      version: 1,
      stages: [
        { key: "won", label: "Closed won", color: "emerald" },
        { key: "new", label: "New business", color: "blue" },
        { key: "contacted", label: "Reached", color: "cyan" },
        { key: "qualified", label: "Qualified", color: "green" },
        { key: "proposal", label: "Proposal", color: "amber" },
        { key: "lost", label: "Closed lost", color: "slate" },
      ],
    },
  });
  api.listSalesInquiries.mockResolvedValue(emptyPage);
  await act(async () => {
    root.render(
      <PipelineProvider>
        <SalesPipelineBoard onCreate={vi.fn()} onOpen={vi.fn()} />
      </PipelineProvider>,
    );
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(
    [...host.querySelectorAll(".sales-pipeline-column h3 .pipeline-stage")].map(
      (stage) => stage.textContent,
    ),
  ).toEqual([
    "Closed won",
    "New business",
    "Reached",
    "Qualified",
    "Proposal",
    "Closed lost",
  ]);
  const firstStage = host.querySelector(
    ".sales-pipeline-column h3 .pipeline-stage",
  ) as HTMLSpanElement;
  expect(firstStage.style.color).toBe("rgb(5, 150, 105)");
  expect(
    host.querySelector('[aria-label="Closed won inquiries"]'),
  ).not.toBeNull();
});
