// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { Router } from "wouter";
import LoginPage from "@/features/auth/login-page";
import AdminSetupPage from "@/features/auth/admin-setup-page";
import { DEFAULT_BRANDING_SETTINGS } from "@/lib/branding";

vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ login: { isPending: false, mutate: vi.fn() } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

(globalThis as typeof globalThis & { React?: typeof React; IS_REACT_ACT_ENVIRONMENT?: boolean }).React = React;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function renderPage(Page: React.ComponentType, path: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(["/api/auth/federation/status"], {enabled:false});
  queryClient.setQueryData(["/api/setup/status"], { needsSetup: true });
  queryClient.setQueryData(["/api/seo/global"], null);
  const container = document.createElement("div");
  const root = createRoot(container);
  act(() => root.render(<QueryClientProvider client={queryClient}><Router ssrPath={path}><Page /></Router></QueryClientProvider>));
  const html = container.innerHTML;
  act(() => root.unmount());
  queryClient.clear();
  return html;
}

describe("P1 administrative authentication shell", () => {
  for (const [title, Page, path] of [["login", LoginPage, "/admin/login"], ["fresh setup", AdminSetupPage, "/admin/setup"]] as const) {
    it(`${title} has P1 branding without removed public module links`, () => {
      const html = renderPage(Page, path);
      expect(html).toContain("P1 Land &amp; Property Management");
      expect(html).toContain('src="/admin/p1-symbol.svg"');
      expect(html).toContain('data-testid="link-back-to-p1"');
      expect(html).toContain("Back to P1 website");
      expect(html).not.toContain("Core Platform");
      expect(html).not.toContain("Find Service Providers");
      expect(html).not.toContain("Applications are currently closed");
      expect(html).not.toMatch(/href="\/(directory|join|therapist|events|recordings|shop|cart|membership)(?:\/|\")/);
      expect(html).toContain('type="password"');
      expect(html).toContain('type="submit"');
    });
  }
  it("fresh branding fallback points to the P1 symbol through the admin proxy", () => {
    expect(DEFAULT_BRANDING_SETTINGS.companyName).toBe("P1 Land & Property Management");
    expect(DEFAULT_BRANDING_SETTINGS.frontendLogoUrl).toBe("/admin/p1-symbol.svg");
    expect(DEFAULT_BRANDING_SETTINGS.faviconUrl).toBe("/admin/p1-symbol.svg");
  });
});
