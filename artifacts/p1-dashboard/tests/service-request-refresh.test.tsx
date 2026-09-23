// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ServiceRequestTriage } from "../src/ServiceRequestTriage";

let host: HTMLDivElement;
let root: Root;
const requestId = "11111111-1111-4111-8111-111111111111";
const initial = {
  id: requestId,
  property_name: "Synthetic property",
  description: "Drainage review",
  status: "new",
  version: 1,
  updated_at: "2026-09-22T12:00:00.000Z",
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

it("refreshes the selected request detail when the list receives a newer version", async () => {
  const updated = { ...initial, status: "triaged", version: 2, updated_at: "2026-09-22T12:10:00.000Z" };
  const api = vi.fn().mockResolvedValueOnce(initial).mockResolvedValueOnce(updated);
  const props = { role: "owner", api, onRefresh: vi.fn().mockResolvedValue(undefined) };
  await act(async () => {
    root.render(<ServiceRequestTriage {...props} records={[initial]} />);
    await Promise.resolve();
  });
  expect(api).toHaveBeenCalledTimes(1);
  await act(async () => {
    root.render(<ServiceRequestTriage {...props} records={[updated]} />);
    await Promise.resolve();
  });
  expect(api).toHaveBeenCalledTimes(2);
  expect(host.querySelector(".request-detail .badge")?.textContent).toBe("triaged");
});

it("keeps a failed detail summary readable but blocks mutations until retry verifies it", async () => {
  const api = vi.fn().mockRejectedValueOnce(Error("Temporary detail failure")).mockResolvedValueOnce(initial);
  const generateEstimate = vi.fn();
  await act(async () => {
    root.render(<ServiceRequestTriage records={[initial]} role="owner" api={api} onRefresh={vi.fn().mockResolvedValue(undefined)} onGenerateEstimate={generateEstimate} />);
    await Promise.resolve();
  });
  expect(host.querySelector(".request-detail h3")?.textContent).toBe("Drainage review");
  expect(host.querySelector(".request-detail [role='alert']")?.textContent).toContain("Temporary detail failure");
  expect(host.querySelector(".request-transition")).toBeNull();
  expect(host.textContent).not.toContain("Generate estimate");
  await act(async () => {
    Array.from(host.querySelectorAll("button")).find((button) => button.textContent === "Retry request details")?.click();
    await Promise.resolve();
  });
  expect(api).toHaveBeenCalledTimes(2);
  expect(host.querySelector(".request-transition")).not.toBeNull();
  expect(host.textContent).toContain("Generate estimate");
  expect(generateEstimate).not.toHaveBeenCalled();
});
