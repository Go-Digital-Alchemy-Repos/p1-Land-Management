import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const api = vi.hoisted(() => ({
  listFieldConflicts: vi.fn(),
  resolveFieldConflict: vi.fn(),
  getFieldResolutionReceipts: vi.fn(),
}));
const queue = vi.hoisted(() => ({ pending: vi.fn(), acknowledge: vi.fn() }));
vi.mock("@workspace/api-client-react/dashboard", () => api);
vi.mock("../src/offline", () => queue);
import { FieldConflictReview } from "../src/FieldConflictReview";
import { reconcileFieldResolutions } from "../src/field-resolution-receipts";
let host: HTMLDivElement, root: Root;
const row = {
  id: "event",
  work_title: "Cancelled visit",
  property_name: "Test property",
  submitted_by: "Crew",
  kind: "complete",
  payload: { note: "<img src=x>" },
  captured_at: "2026-09-19T12:00:00Z",
  base_version: 1,
  work_status: "cancelled",
};
beforeEach(() => {
  vi.resetAllMocks();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.spyOn(window, "confirm").mockReturnValue(true);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  api.listFieldConflicts.mockResolvedValue({ items: [row], hasMore: false });
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});
async function click(label: string) {
  const button = [...host.querySelectorAll("button")].find(
    (b) => b.textContent === label,
  )!;
  expect(button).toBeTruthy();
  await act(async () => button.click());
}
it("keeps an uncertain decision immutable and retries the same request without applying stale work", async () => {
  api.resolveFieldConflict
    .mockRejectedValueOnce(new Error("Lost response"))
    .mockResolvedValueOnce({ id: "event", status: "resolved" });
  await act(async () => root.render(<FieldConflictReview />));
  await click("Review entry");
  expect(host.querySelector("pre")?.textContent).toContain("<img src=x>");
  expect(host.querySelector("img")).toBeNull();
  const textarea = host.querySelector("textarea")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!.call(textarea, "Cancelled visit reviewed with crew.");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await click("Resolve without applying");
  expect(api.resolveFieldConflict).not.toHaveBeenCalled();
  await click("Confirm review");
  expect(textarea.disabled).toBe(true);
  expect(host.querySelector('[role="alert"]')?.textContent).toContain(
    "could not be confirmed",
  );
  await click("Retry same resolution");
  expect(api.resolveFieldConflict.mock.calls[0].slice(0, 2)).toEqual(
    api.resolveFieldConflict.mock.calls[1].slice(0, 2),
  );
  expect(api.resolveFieldConflict.mock.calls[1][1]).toEqual({
    note: "Cancelled visit reviewed with crew.",
    disposition: "record_only",
  });
  expect(host.textContent).toContain("Work status and billing are unchanged");
  expect(host.querySelector("textarea")).toBeNull();
});
it("batches large queues and clears only matching resolved IDs, never foreign, accepted or duplicate receipts", async () => {
  queue.pending.mockResolvedValue(
    Array.from({ length: 205 }, (_, i) => ({ id: String(i) })),
  );
  api.getFieldResolutionReceipts.mockImplementation(async ({ events }) => ({
    results: [
      { id: events[0].id, status: "resolved" },
      { id: events[0].id, status: "resolved" },
      { id: "foreign", status: "resolved" },
      { id: events[1].id, status: "accepted" },
    ],
  }));
  expect(await reconcileFieldResolutions("crew")).toBe(3);
  expect(
    api.getFieldResolutionReceipts.mock.calls.map(([b]) => b.events.length),
  ).toEqual([100, 100, 5]);
  expect(queue.acknowledge.mock.calls).toEqual([
    ["crew", "0"],
    ["crew", "100"],
    ["crew", "200"],
  ]);
});
it("preserves unconfirmed batches when the receipt request fails", async () => {
  queue.pending.mockResolvedValue([{ id: "unconfirmed" }]);
  api.getFieldResolutionReceipts.mockRejectedValue(new Error("Offline"));
  await expect(reconcileFieldResolutions("crew")).rejects.toThrow("Offline");
  expect(queue.acknowledge).not.toHaveBeenCalled();
});
