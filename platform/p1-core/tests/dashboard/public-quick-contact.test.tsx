import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { resolveSiteIdentity } from "../../../../artifacts/p1-website/src/lib/site-identity";
const state = vi.hoisted(() => ({ identity: null as any, global: {} as Record<string, string> }));
vi.mock("../../../../artifacts/p1-website/src/lib/use-site-identity", () => ({
  useSiteIdentity: () => resolveSiteIdentity(state.identity, state.global, "/logo.svg"),
}));
vi.mock("../../../../artifacts/p1-website/src/components/layout/SiteHeader", () => ({ SiteHeader: () => null }));
vi.mock("../../../../artifacts/p1-website/src/components/layout/SiteFooter", () => ({ SiteFooter: () => null }));
import { Layout } from "../../../../artifacts/p1-website/src/components/layout/Layout";
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  // This shared test configuration uses classic JSX for public-site files;
  // the production website uses the automatic React Vite transform.
  vi.stubGlobal("React", React);
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  state.identity = null; state.global = {};
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const call = () => host.querySelector('nav[aria-label="Quick contact"] a')!;
it("keeps the fallback number and existing mobile call styling", async () => {
  await act(async () => root.render(<Layout assessmentCta><p>Content</p></Layout>));
  expect(call().getAttribute("href")).toBe("tel:+17042218928");
  expect(call().getAttribute("aria-label")).toBe("Call P1 at (704) 221-8928");
  expect(call().textContent).toBe("Call P1");
  expect(call().className).toBe("p-4 text-center font-bold text-secondary");
});
it("follows coherent published identity revisions and falls back on invalid identity", async () => {
  state.identity = { version: "one", phoneDisplay: "(803) 555-0123", phoneHref: "tel:+18035550123" };
  await act(async () => root.render(<Layout assessmentCta><p>Content</p></Layout>));
  expect(call().getAttribute("href")).toBe("tel:+18035550123");
  expect(call().getAttribute("aria-label")).toBe("Call P1 at (803) 555-0123");
  state.identity = { version: "two", phoneDisplay: "(864) 555-0145", phoneHref: "tel:+18645550145" };
  await act(async () => root.render(<Layout assessmentCta><p>Other route</p></Layout>));
  expect(call().getAttribute("href")).toBe("tel:+18645550145");
  expect(call().getAttribute("aria-label")).toBe("Call P1 at (864) 555-0145");
  state.identity = { version: "bad", phoneDisplay: "(864) 555-0145", phoneHref: "tel:+18035550123" };
  await act(async () => root.render(<Layout assessmentCta><p>Content</p></Layout>));
  expect(call().getAttribute("href")).toBe("tel:+17042218928");
});
