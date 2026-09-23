// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AddressAutocomplete } from "../../../../artifacts/p1-dashboard/src/AddressAutocomplete";

let host: HTMLDivElement;
let root: Root;
const selected = vi.fn();
const result = {
  id: "test-place",
  label: "100 N Tryon St, Charlotte, NC 28202, United States",
  line1: "100 N Tryon St",
  city: "Charlotte",
  state: "NC",
  postalCode: "28202",
  businessName: "Example Office",
};

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  selected.mockClear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});

function enter(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

it("selects a business address by keyboard and provides structured fields", async () => {
  const fetcher = vi.fn(async () => ({
    ok: true,
    json: async () => ({ available: true, suggestions: [result] }),
  }));
  vi.stubGlobal("fetch", fetcher);
  await act(async () =>
    root.render(
      <AddressAutocomplete
        label="Address line 1"
        format="line1"
        completeOnly
        onAddressSelect={selected}
      />,
    ),
  );
  const input = host.querySelector("input")!;
  await act(async () => enter(input, "100 N Tryon"));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
  });
  expect(fetcher).toHaveBeenCalledOnce();
  expect(host.querySelector('[role="option"]')?.textContent).toContain("Example Office");
  await act(async () =>
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })),
  );
  await act(async () =>
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
  );
  expect(input.value).toBe("100 N Tryon St");
  expect(selected).toHaveBeenCalledWith(result, input);
  expect(host.textContent).toContain("OpenStreetMap contributors");
});

it("keeps manual address entry available when the provider is unconfigured", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => ({ available: false, suggestions: [] }) })),
  );
  await act(async () => root.render(<AddressAutocomplete label="Business address" required />));
  const input = host.querySelector("input")!;
  await act(async () => enter(input, "Custom property address"));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
  });
  expect(input.value).toBe("Custom property address");
  expect(host.textContent).toContain("Continue entering the address manually");
  expect(selected).not.toHaveBeenCalled();
});
