// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { PublicFormRenderer } from "@/components/forms/public-form-renderer";
let host: HTMLDivElement;
let root: Root;
const fixture: any = {
  id: "form",
  name: "Inquiry",
  slug: "inquiry",
  fields: [{ id: "name", key: "name", label: "Name", type: "text", required: false }],
  settings: { submitButtonText: "Send" },
};
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function mount(extra = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await act(async () =>
    root.render(
      <QueryClientProvider client={client}>
        <PublicFormRenderer slug="inquiry" formOverride={fixture} {...extra} />
      </QueryClientProvider>,
    ),
  );
}
async function submit() {
  await act(async () =>
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
}
it("retains public submission credentials, payload and idempotency across retry", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Try again" }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ message: "Saved" }) });
  vi.stubGlobal("fetch", fetch);
  await mount();
  const input = host.querySelector("input")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "Owner");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await submit();
  await submit();
  expect(fetch).toHaveBeenCalledTimes(2);
  const [url, request] = fetch.mock.calls[0];
  expect(url).toBe("/api/forms/inquiry/submit");
  expect(request.credentials).toBe("include");
  expect(request.method).toBe("POST");
  expect(JSON.parse(request.body)).toEqual({ name: "Owner" });
  expect(request.headers["Idempotency-Key"]).toBeTruthy();
  expect(fetch.mock.calls[1][1].headers["Idempotency-Key"]).toBe(
    request.headers["Idempotency-Key"],
  );
});
it("retains custom submission endpoint and body adapter", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
  vi.stubGlobal("fetch", fetch);
  await mount({
    submitUrl: "/api/custom-inquiry",
    buildSubmitBody: (values: any) => ({ values, source: "custom" }),
  });
  await submit();
  expect(fetch.mock.calls[0][0]).toBe("/api/custom-inquiry");
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
    values: { name: "" },
    source: "custom",
  });
});

it("keeps the standalone retained focal-point picker API compatible", async () => {
  const { ImagePositionPicker } = await import("../components/image-position-picker");
  const change = vi.fn();
  await act(async () =>
    root.render(
      <ImagePositionPicker
        imageUrl="/uploads/photo.png"
        positionX={50}
        positionY={50}
        onPositionChange={change}
      />,
    ),
  );
  const bottomRight = Array.from(host.querySelectorAll("button")).find(
    (button) =>
      button.title === "Bottom Right" ||
      button.getAttribute("aria-label") === "Bottom Right" ||
      button.textContent === "Bottom Right",
  );
  expect(bottomRight).toBeTruthy();
  await act(async () => bottomRight!.click());
  expect(change).toHaveBeenCalledWith(100, 100);
});
