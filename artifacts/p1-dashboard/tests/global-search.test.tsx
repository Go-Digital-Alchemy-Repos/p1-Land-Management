// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { GlobalSearch } from "../src/GlobalSearch";

let host: HTMLDivElement, root: Root;
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  vi.useFakeTimers();
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it("opens with Cmd-K, searches after two characters, and activates a result with Enter", async () => {
  const navigate = vi.fn();
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ kind: "property", id: "synthetic", title: "Synthetic site", subtitle: "Main Road", href: "/properties/synthetic" }] });
  vi.stubGlobal("fetch", fetcher);
  await act(async () => root.render(<GlobalSearch userId="test-user" onNavigate={navigate} />));
  await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true })));
  const input = host.querySelector<HTMLInputElement>('input[type="search"]')!;
  expect(input).toBeTruthy();
  const type = (value: string) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); };
  await act(async () => type("S"));
  await act(async () => vi.advanceTimersByTime(300));
  expect(fetcher).not.toHaveBeenCalled();
  await act(async () => type("Synthetic"));
  await act(async () => { vi.advanceTimersByTime(300); await Promise.resolve(); await Promise.resolve(); });
  expect(fetcher).toHaveBeenCalledWith("/api/v1/search?q=Synthetic", expect.any(Object));
  await act(async () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  expect(navigate).toHaveBeenCalledWith("/properties/synthetic");
});
