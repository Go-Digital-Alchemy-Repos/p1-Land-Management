import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("@/components/layout/page-layout", () => ({ PageLayout: ({ children }: any) => <main>{children}</main> }));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({}) }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: vi.fn() }));
import { FederationPanel } from "./federation-panel";
beforeEach(() => vi.stubGlobal("React", React));
afterEach(() => vi.unstubAllGlobals());
it("shows the existing-account proof form expanded after an unlinked callback", () => {
  vi.stubGlobal("window", { location: { search: "?federation=link-required" } });
  const html = renderToStaticMarkup(<FederationPanel />);
  expect(html).toContain('role="alert"');
  expect(html).toContain("Your Dashboard sign-in succeeded");
  expect(html).toContain('<details open="">');
  expect(html).toContain('autoComplete="current-password"');
  expect(html).toContain("Prove existing account and continue");
  expect(html).not.toContain("Confirm this account link");
});
it("does not show a false linking failure during ordinary sign-in", () => {
  vi.stubGlobal("window", { location: { search: "" } });
  const html = renderToStaticMarkup(<FederationPanel />);
  expect(html).not.toContain('role="alert"');
  expect(html).not.toContain('<details open="">');
});
