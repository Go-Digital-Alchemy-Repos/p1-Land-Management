// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import AdminCrmPage, {
  getSubmissionFields,
  LeadSubmissionDetails,
} from "@/features/admin/crm-page";
import type { CrmLead } from "@shared/schema";

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

describe("AdminCrmPage", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    useQueryMock.mockImplementation(
      ({ queryKey, enabled = true }: { queryKey: unknown[]; enabled?: boolean }) => {
        if (!enabled) return { data: undefined, isLoading: false };
        if (queryKey[0] === "/api/admin/crm" && queryKey.length === 2) {
          return {
            data: [
              {
                id: "lead-1",
                name: "Ada Lovelace",
                email: "ada@example.com",
                phone: null,
                company: "Compiler Co",
                stage: "new",
                source: "manual",
                nextFollowUpAt: null,
                createdAt: new Date(),
              },
            ],
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
    vi.stubGlobal(
      "ResizeObserver",
      class ResizeObserver {
        observe() {}
        disconnect() {}
        unobserve() {}
      },
    );
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
    vi.unstubAllGlobals();
    container.remove();
  });

  it("renders the fixed drag-and-drop pipeline stages", () => {
    act(() => {
      root = createRoot(container);
      root.render(<AdminCrmPage />);
    });

    expect(container.textContent).toContain("CRM Pipeline");
    expect(container.textContent).toContain("New");
    expect(container.textContent).toContain("Contacted");
    expect(container.textContent).toContain("Qualified");
    expect(container.textContent).toContain("Proposal");
    expect(container.textContent).toContain("Won");
    expect(container.textContent).toContain("Lost");
    expect(container.querySelector('[data-testid="card-crm-lead-lead-1"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="select-move-crm-lead-lead-1"]')).not.toBeNull();
  });

  it("formats every submitted form field for the lead profile", () => {
    expect(
      getSubmissionFields({
        propertyType: "Commercial",
        services: ["grading", "drainage"],
        contactByPhone: true,
        message: "Please assess the south field.",
      }),
    ).toEqual([
      { label: "Property Type", value: "Commercial" },
      { label: "Services", value: "grading, drainage" },
      { label: "Contact By Phone", value: "Yes" },
      { label: "Message", value: "Please assess the south field." },
    ]);
  });

  it("shows contact information, the original message, and all form data together", () => {
    const lead: CrmLead = {
      id: "lead-submission",
      name: "Grace Hopper",
      email: "grace@example.com",
      phone: "555-0101",
      company: "Compiler Co",
      message: "Please assess the south field.",
      stage: "new",
      source: "website_form",
      externalId: null,
      formSubmissionId: "submission-1",
      formData: {
        name: "Grace Hopper",
        email: "grace@example.com",
        address: "123 Main Street",
        acreage: "12 acres",
        message: "Please assess the south field.",
      },
      metadata: { formName: "P1 Estimate Request" },
      ownerId: null,
      nextFollowUpAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    act(() => {
      root = createRoot(container);
      root.render(<LeadSubmissionDetails lead={lead} />);
    });

    expect(container.textContent).toContain("Grace Hopper");
    expect(container.textContent).toContain("grace@example.com");
    expect(container.textContent).toContain("555-0101");
    expect(container.textContent).toContain("Please assess the south field.");
    expect(container.textContent).toContain("123 Main Street");
    expect(container.textContent).toContain("12 acres");
    expect(container.textContent).toContain("P1 Estimate Request");
  });
});
