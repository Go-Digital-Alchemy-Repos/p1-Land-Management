// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { BillingRecords } from "../src/BillingRecords";

let host: HTMLDivElement;
let root: Root;
const drafts = [
  {
    id: "synthetic-draft",
    property_id: "synthetic-property",
    title: "First visit",
    property_name: "North site",
    amount_cents: 12500,
    kind: "service" as const,
    status: "draft" as const,
    created_at: "2026-09-22T12:00:00Z",
  },
  {
    id: "synthetic-posted",
    property_id: "synthetic-property",
    title: "Deposit",
    property_name: "South site",
    amount_cents: 30000,
    kind: "deposit" as const,
    status: "posted" as const,
    created_at: "2026-09-21T12:00:00Z",
    ownership_verified: false,
  },
];
const invoices = [
  {
    id: "synthetic-invoice",
    document_number: "1001",
    client_name: "Synthetic client",
    balance_cents: 9000,
    ownership_verified: true,
    payment_url: "https://example.test/pay",
  },
];

beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

it("keeps QuickBooks posting behind an explicit review and lets a failed attempt retry", async () => {
  const onPost = vi
    .fn()
    .mockRejectedValueOnce(new Error("Provider unavailable"))
    .mockResolvedValueOnce(undefined);
  await act(async () =>
    root.render(
      <BillingRecords
        drafts={drafts}
        invoices={invoices}
        canManage
        onPost={onPost}
      />,
    ),
  );
  expect(host.querySelectorAll("article.billing-record")).toHaveLength(3);
  expect(onPost).not.toHaveBeenCalled();

  const review = Array.from(host.querySelectorAll("button")).find(
    (button) => button.textContent === "Review QuickBooks posting",
  )!;
  await act(async () => review.click());
  expect(host.textContent).toContain("Confirm the property and amount");
  expect(host.textContent).toContain("$125.00");
  expect(onPost).not.toHaveBeenCalled();

  const post = () =>
    Array.from(host.querySelectorAll("button")).find(
      (button) => button.textContent === "Post to QuickBooks",
    )!;
  await act(async () => post().click());
  expect(onPost).toHaveBeenCalledWith("synthetic-draft");
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    "Provider unavailable",
  );
  expect(host.textContent).toContain("Post to QuickBooks");
  await act(async () => post().click());
  expect(onPost).toHaveBeenCalledTimes(2);
  expect(host.textContent).not.toContain("Confirm the property and amount");
});

it("filters records and hides staff posting from client views", async () => {
  await act(async () =>
    root.render(
      <BillingRecords
        drafts={drafts.filter((draft) => draft.status === "posted")}
        invoices={invoices}
        canManage={false}
        onPost={vi.fn()}
      />,
    ),
  );
  expect(host.textContent).not.toContain("Review QuickBooks posting");
  expect(host.textContent).not.toContain("Customer mapping needs review");
  const search = host.querySelector<HTMLInputElement>('input[type="search"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(search, "1001");
    search.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(host.querySelectorAll("article.billing-record")).toHaveLength(1);
  expect(host.textContent).toContain("Invoice 1001");
});
