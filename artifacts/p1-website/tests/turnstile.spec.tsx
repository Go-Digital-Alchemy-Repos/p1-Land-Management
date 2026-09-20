import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { usePublicFormVerification } from "../src/components/forms/PublicFormVerification";
import {
  commercialPayload,
  inquiryAttempt,
  sendCommercialInquiry,
} from "../src/lib/commercial-inquiry";
let host: HTMLDivElement,
  root: Root,
  current: ReturnType<typeof usePublicFormVerification>,
  options: Record<string, any>,
  renderWidget: any,
  remove: any;
function Harness({ preview = false }: { preview?: boolean }) {
  current = usePublicFormVerification(preview);
  return (
    <form>
      <input name="name" defaultValue="Retained name" />
      {current.control}
      <button type="submit" disabled={!current.ready}>
        Send
      </button>
    </form>
  );
}
const config = (enabled = true) => ({
  enabled,
  siteKey: enabled ? "test-site-key" : null,
  action: "public_form",
});
async function mount(preview = false) {
  await act(async () => {
    root.render(<Harness preview={preview} />);
    await new Promise((r) => setTimeout(r, 0));
  });
}
beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  renderWidget = vi.fn((_node, o) => {
    options = o;
    return "widget-1";
  });
  remove = vi.fn();
  window.turnstile = { render: renderWidget, remove };
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockImplementation(async () => new Response(JSON.stringify(config()))),
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  delete window.turnstile;
  vi.unstubAllGlobals();
});
it("explicit flexible widget never inserts token in form values and clears/removes on unmount", async () => {
  await mount();
  expect(options.size).toBe("flexible");
  expect(options.action).toBe("public_form");
  expect(options["response-field"]).toBe(false);
  expect(current.ready).toBe(false);
  await act(async () => options.callback("private-token"));
  expect(current.headers()).toEqual({ "X-Turnstile-Token": "private-token" });
  expect([...new FormData(host.querySelector("form")!).keys()]).toEqual([
    "name",
  ]);
  await act(async () => root.unmount());
  expect(remove).toHaveBeenCalledWith("widget-1");
  root = createRoot(host);
});
it("expiry and errors block stale tokens; retry preserves typed input", async () => {
  await mount();
  host.querySelector("input")!.value = "Still here";
  await act(async () => options.callback("old"));
  await act(async () => options["expired-callback"]());
  expect(() => current.headers()).toThrow();
  expect(host.textContent).toContain("expired");
  await act(async () =>
    host.querySelector<HTMLButtonElement>("button[type=button]")!.click(),
  );
  expect(host.querySelector("input")!.value).toBe("Still here");
  expect(remove).toHaveBeenCalled();
  await act(async () => options["error-callback"]());
  expect(current.ready).toBe(false);
  expect(host.textContent).toContain("Call");
});
it("configuration failure fails closed and supports explicit retry", async () => {
  vi.mocked(fetch).mockRejectedValueOnce(Error("offline"));
  await mount();
  expect(renderWidget).not.toHaveBeenCalled();
  expect(() => current.headers()).toThrow();
  expect(host.textContent).toContain("Retry verification");
  await act(async () => current.reset());
  expect(renderWidget).toHaveBeenCalledTimes(1);
});
it("disabled configuration permits header-free submit; malformed configuration does not", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify(config(false))),
  );
  await mount();
  expect(current.ready).toBe(true);
  expect(current.headers()).toEqual({});
  expect(renderWidget).not.toHaveBeenCalled();
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ ...config(), action: "other" })),
  );
  await act(async () => current.reset());
  expect(() => current.headers()).toThrow();
});
it("preview performs no configuration/script request and cannot submit", async () => {
  await mount(true);
  expect(fetch).not.toHaveBeenCalled();
  expect(renderWidget).not.toHaveBeenCalled();
  expect(() => current.headers()).toThrow();
});
it("reset invalidates old callback and commercial retry keeps payload/key while changing only header token", async () => {
  await mount();
  const stale = options.callback;
  await act(async () => options.callback("token-one"));
  const data = new FormData();
  data.set("name", "A");
  const payload = commercialPayload(data, {}),
    attempt = inquiryAttempt(null, payload, () => "stable-key");
  const transport = vi
    .fn()
    .mockRejectedValueOnce(Error("offline"))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ submissionId: "receipt" }), {
        status: 201,
      }),
    );
  await expect(
    sendCommercialInquiry(attempt, transport, current.headers()),
  ).rejects.toThrow("offline");
  await act(async () => current.reset());
  await act(async () => stale("stale-token"));
  expect(() => current.headers()).toThrow();
  await act(async () => options.callback("token-two"));
  expect(inquiryAttempt(attempt, payload, () => "other-key")).toBe(attempt);
  await sendCommercialInquiry(attempt, transport, current.headers());
  const first = transport.mock.calls[0][1],
    second = transport.mock.calls[1][1];
  expect(first.body).toBe(second.body);
  expect(second.headers["Idempotency-Key"]).toBe("stable-key");
  expect(first.headers["X-Turnstile-Token"]).toBe("token-one");
  expect(second.headers["X-Turnstile-Token"]).toBe("token-two");
  expect(second.body).not.toContain("token");
});

it("rejects oversized tokens and configuration streams", async () => {
  await mount();
  await act(async () => options.callback("x".repeat(2049)));
  expect(() => current.headers()).toThrow();
  vi.mocked(fetch).mockResolvedValueOnce(new Response("x".repeat(4097)));
  await act(async () => current.reset());
  expect(current.ready).toBe(false);
  expect(host.textContent).toContain("Retry verification");
});
it("StrictMode disposes the first config request without accepting stale callbacks", async () => {
  await act(async () => {
    root.render(
      <React.StrictMode>
        <Harness />
      </React.StrictMode>,
    );
    await new Promise((r) => setTimeout(r, 0));
  });
  expect(renderWidget).toHaveBeenCalledTimes(1);
  await act(async () => options.callback("strict-token"));
  expect(current.headers()).toEqual({ "X-Turnstile-Token": "strict-token" });
});

it("Cloudflare script failure shows retry and a later available API can recover", async () => {
  delete window.turnstile;
  await mount();
  const script = document.querySelector<HTMLScriptElement>(
    'script[src*="challenges.cloudflare.com"]',
  );
  expect(script?.src).toBe(
    "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit",
  );
  await act(async () => script!.dispatchEvent(new Event("error")));
  expect(current.ready).toBe(false);
  expect(host.textContent).toContain("Retry verification");
  window.turnstile = { render: renderWidget, remove };
  await act(async () => current.reset());
  expect(renderWidget).toHaveBeenCalledTimes(1);
});
