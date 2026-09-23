// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { InspectionReports } from "../src/InspectionReports";

let host: HTMLDivElement;
let root: Root;
const inspection = {
  id: "synthetic-inspection",
  title: "Synthetic site review",
  property_name: "Test property",
  findings: [{ label: "Drainage", condition: "needs_attention", note: "Check inlet" }],
  published: false,
  created_at: "2026-09-22T12:00:00.000Z",
};
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
function button(label: string) {
  return Array.from(host.querySelectorAll("button")).find((item) => item.textContent?.trim() === label);
}

it("requires an explicit review and confirmation before a report becomes client-visible", async () => {
  const publish = vi.fn().mockResolvedValue(undefined);
  await act(async () => root.render(<InspectionReports inspections={[inspection]} canPublish onPublish={publish} />));
  await act(async () => button("Review report")?.click());
  expect(publish).not.toHaveBeenCalled();
  expect(host.textContent).toContain("Check inlet");
  await act(async () => button("Cancel")?.click());
  expect(publish).not.toHaveBeenCalled();
  await act(async () => button("Review report")?.click());
  await act(async () => { button("Publish report to client")?.click(); await Promise.resolve(); });
  expect(publish).toHaveBeenCalledTimes(1);
  expect(publish).toHaveBeenCalledWith("synthetic-inspection");
});
