// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { ExpenseRecords } from "../src/ExpenseRecords";

let host: HTMLDivElement;
let root: Root;
const records = [
  { id: "synthetic-one", description: "Irrigation repair", category: "Maintenance", amount_cents: 12850, incurred_on: "2026-09-22", property_name: "North site" },
  { id: "synthetic-two", description: "Mulch delivery", category: "Materials", amount_cents: 4500, incurred_on: "2026-09-21", property_name: "South site" },
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

it("filters concise expense records and opens their exact amount and date", async () => {
  await act(async () => root.render(<ExpenseRecords records={records} />));
  expect(host.querySelectorAll("article.expense-record")).toHaveLength(2);
  const search = host.querySelector<HTMLInputElement>('input[type="search"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(search, "North");
    search.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(host.querySelectorAll("article.expense-record")).toHaveLength(1);
  expect(host.textContent).toContain("$128.50");
  expect(host.textContent).toContain("9/22/2026");
  expect(host.textContent).not.toContain("Mulch delivery");
  await act(async () => root.render(<ExpenseRecords records={[]} />));
  expect(host.textContent).toContain("No expenses yet");
});
