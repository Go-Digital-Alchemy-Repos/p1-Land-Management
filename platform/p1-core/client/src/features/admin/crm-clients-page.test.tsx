// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import AdminCrmClientsPage from "@/features/admin/crm-clients-page";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (options: unknown) => useQueryMock(options),
    useMutation: (options: unknown) => useMutationMock(options),
  };
});

vi.mock("@/components/shared/protected-route", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "protected-route" }, children),
}));

vi.mock("@/features/admin/admin-sidebar", () => ({
  AdminSidebar: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "admin-sidebar" }, children),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe("AdminCrmClientsPage", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    useQueryMock.mockImplementation(
      ({ queryKey, enabled = true }: { queryKey: unknown[]; enabled?: boolean }) => {
        if (!enabled) return { data: undefined, isLoading: false };
        if (queryKey[0] === "/api/admin/crm/clients" && typeof queryKey[1] === "object") {
          return {
            data: [
              {
                id: "client-1",
                name: "Ada Lovelace",
                email: "ada@example.com",
                phone: null,
                company: "Compiler Co",
                clientType: "business",
                primaryEmail: "ada@example.com",
                primaryPhone: null,
                preferredContactMethod: "email",
                companyName: "Compiler Co",
                onboardingStatus: "not_started",
                internalTags: [],
                status: "onboarding",
                source: "website_form",
                nextFollowUpAt: null,
              },
            ],
            isLoading: false,
          };
        }
        if (queryKey[0] === "/api/admin/crm/clients" && queryKey[1] === "client-1") {
          return {
            data: {
              id: "client-1",
              name: "Ada Lovelace",
              email: "ada@example.com",
              phone: null,
              company: "Compiler Co",
              clientType: "business",
              primaryEmail: "ada@example.com",
              primaryPhone: null,
              secondaryEmail: null,
              alternatePhone: null,
              preferredContactMethod: "email",
              addressLine1: null,
              addressLine2: null,
              city: "Arlington",
              region: "VA",
              postalCode: null,
              country: "United States",
              companyName: "Compiler Co",
              legalName: null,
              website: "https://compiler.example",
              industry: "Technology",
              companySize: "11-50",
              businessType: "LLC",
              companyPhone: null,
              companyEmail: "hello@compiler.example",
              billingContactName: "Ada Lovelace",
              billingEmail: "billing@compiler.example",
              billingPhone: null,
              accountOwnerId: null,
              onboardingStatus: "not_started",
              serviceStartDate: null,
              renewalDate: null,
              clientSince: null,
              internalTags: ["priority"],
              status: "onboarding",
              source: "website_form",
              nextFollowUpAt: null,
              createdAt: "2026-07-10T19:44:00.000Z",
              sourceLead: { id: "lead-1", name: "Ada Lead" },
              notes: [],
              tasks: [],
              formData: {
                city: "Arlington",
                fullName: "Ada Lovelace",
                emailAddress: "ada@example.com",
                phoneNumber: "7046085783",
                projectDetails: "Please help with an implementation plan.",
                servicesNeeded: ["Strategy", "Implementation"],
              },
              metadata: {
                formName: "Residential Quote Form",
                convertedAt: "2026-07-10T19:52:00.000Z",
                ipAddress: "203.0.113.10",
              },
            },
            isLoading: false,
          };
        }

        return { data: undefined, isLoading: false };
      },
    );
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    (
      globalThis as typeof globalThis & { React?: typeof React; IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).React = React;
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    container.remove();
  });

  it("renders converted clients with lifecycle status", () => {
    act(() => {
      root = createRoot(container);
      root.render(<AdminCrmClientsPage />);
    });

    expect(container.textContent).toContain("CRM Clients");
    expect(container.textContent).toContain("Ada Lovelace");
    expect(container.textContent).toContain("Onboarding");
    expect(container.textContent).toContain("Business");
    expect(container.textContent).toContain("Compiler Co");
  });

  it("renders expanded profile tabs for a selected client", () => {
    act(() => {
      root = createRoot(container);
      root.render(<AdminCrmClientsPage />);
    });

    const clientRow = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Ada Lovelace"),
    );
    expect(clientRow).not.toBeNull();
    act(() => {
      clientRow?.click();
    });

    expect(document.body.textContent).toContain("Overview");
    expect(document.body.textContent).toContain("Contact");
    expect(document.body.textContent).toContain("Company");
    expect(document.body.textContent).toContain("Billing/Admin");
    expect(document.body.querySelector('[data-testid="select-crm-client-type"]')).not.toBeNull();
  });

  it("renders submitted data in a humanized client data tab", () => {
    act(() => {
      root = createRoot(container);
      root.render(<AdminCrmClientsPage />);
    });

    const clientRow = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Ada Lovelace"),
    );
    act(() => {
      clientRow?.click();
    });

    const dataTab = Array.from(document.body.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Data"),
    );
    expect(dataTab).not.toBeNull();
    act(() => {
      dataTab?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      dataTab?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      dataTab?.click();
    });

    expect(document.body.textContent).toContain("Record Details");
    expect(document.body.textContent).toContain("Information Submitted");
    expect(document.body.textContent).toContain("Residential Quote Form");
    expect(document.body.textContent).toContain("Full Name");
    expect(document.body.textContent).toContain("Ada Lovelace");
    expect(document.body.textContent).toContain("Services Needed");
    expect(document.body.textContent).toContain("Strategy");
    expect(document.body.textContent).not.toContain('"formData"');
  });
});
