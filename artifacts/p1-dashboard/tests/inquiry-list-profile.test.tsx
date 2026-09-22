// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ listSalesInquiries: vi.fn() }));
vi.mock("@workspace/api-client-react/dashboard", () => api);
vi.mock("../src/PipelineSettings", () => ({
  usePipelineStages: () => [{ key: "new", label: "New" }],
  PipelineStage: ({ value }: { value: string }) => <span>{value}</span>,
}));
import { InquiryList } from "../src/InquiryList";

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  vi.resetAllMocks();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  api.listSalesInquiries.mockResolvedValue({
    items: [{
      id: "11111111-1111-4111-8111-111111111111",
      name: "Test Lead",
      status: "new",
      reported_company_name: "P1 QA",
      location: "Synthetic location",
      owner_id: null,
      owner_name: null,
      next_action: "Review the inquiry",
      next_action_due_at: null,
    }],
    nextCursor: null,
  });
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });

it("keeps Sales results scannable and opens the deep-linked inquiry profile", async () => {
  const onOpen = vi.fn();
  await act(async () => {
    root.render(<InquiryList onCreate={vi.fn()} onOpen={onOpen} revision={0} owners={[]} />);
    await Promise.resolve();
  });
  const link = host.querySelector<HTMLAnchorElement>('a[href="/sales/leads/11111111-1111-4111-8111-111111111111"]');
  expect(link?.textContent).toContain("Test Lead");
  expect(host.textContent).toContain("Review the inquiry");
  expect(host.textContent).not.toContain("Save inquiry details");
  await act(async () => link?.click());
  expect(onOpen).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
});
