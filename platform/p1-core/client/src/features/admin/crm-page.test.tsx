// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import AdminCrmPage from "@/features/admin/crm-page";

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
});
