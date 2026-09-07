// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import DocsPage from "@/features/admin/docs-page";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const lockGuardMock = vi.fn();
const navigateMock = vi.fn();
const editorLockState = {
  hasLocking: true,
  hasLoaded: true,
  isReadOnly: true,
  isLoading: false,
  acquire: vi.fn(),
  summary: {
    variant: "warning" as const,
    title: "Document already checked out",
    description: "Jamie Editor is already editing this document.",
  },
};
let mutationStates: Array<{
  mutate: ReturnType<typeof vi.fn>;
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
}> = [];

const mockDocs = [
  {
    id: "doc-1",
    title: "Editor Workflow",
    slug: "editor-workflow",
    category: "Getting Started",
    content: "# Editor Workflow\n\n## Steps\n\n[API Reference](/admin/docs/api-reference)",
    isPublished: true,
    sortOrder: 1,
  },
  {
    id: "doc-2",
    title: "API Reference",
    slug: "api-reference",
    category: "API Reference",
    content: "# API Reference",
    isPublished: true,
    sortOrder: 2,
  },
];

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (options: unknown) => useQueryMock(options),
    useMutation: (options: unknown) => useMutationMock(options),
  };
});

vi.mock("wouter", () => ({
  useLocation: () => ["/admin/docs", navigateMock],
  useRoute: () => [false, null],
}));

vi.mock("@/features/admin/admin-sidebar", () => ({
  AdminSidebar: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "admin-sidebar" }, children),
}));

vi.mock("@/components/shared/editor-lock-banner", () => ({
  EditorLockBanner: ({ title }: { title: string }) =>
    React.createElement("div", { "data-testid": "editor-lock-banner" }, title),
}));

vi.mock("@/components/shared/loading-spinner", () => ({
  LoadingSpinner: () => React.createElement("div", { "data-testid": "loading-spinner" }, "Loading"),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-editor-lock", () => ({
  useEditorLock: () => editorLockState,
}));

vi.mock("@/hooks/use-lock-conflict-guard", () => ({
  useLockConflictGuard: (args: unknown) => lockGuardMock(args),
}));

describe("DocsPage", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    navigateMock.mockReset();
    lockGuardMock.mockReset();
    editorLockState.isReadOnly = true;
    mutationStates = [];
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === "/api/admin/docs") {
        return { data: mockDocs, isLoading: false };
      }

      return { data: [], isLoading: false };
    });
    useMutationMock.mockImplementation(() => {
      const state = {
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
      };
      mutationStates.push(state);
      return state;
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

  it("renders the developer resource center title and table of contents", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(DocsPage));
    });

    expect(document.body.querySelector('[data-testid="text-page-title"]')?.textContent).toBe(
      "Developer Resource Center",
    );
    expect(
      document.body.querySelector('[data-testid="doc-table-of-contents"]')?.textContent,
    ).toContain("Steps");
  });

  it("searches document titles and content", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(DocsPage));
    });

    const searchInput = document.body.querySelector(
      '[data-testid="input-search-docs"]',
    ) as HTMLInputElement | null;
    expect(searchInput).not.toBeNull();

    await act(async () => {
      searchInput!.value = "API";
      searchInput!.dispatchEvent(new Event("input", { bubbles: true }));
    });

    expect(document.body.textContent).toContain("API Reference");
  });

  it("navigates internal document links", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(DocsPage));
    });

    const link = document.body.querySelector(
      '[data-doc-slug="api-reference"]',
    ) as HTMLAnchorElement | null;
    expect(link).not.toBeNull();

    await act(async () => {
      link!.click();
    });

    expect(navigateMock).toHaveBeenCalledWith("/admin/docs/api-reference");
    expect(document.body.querySelector('[data-testid="text-doc-title"]')?.textContent).toContain(
      "API Reference",
    );
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    root = null;
    vi.unstubAllGlobals();
    container.remove();
    document.body.innerHTML = "";
  });

  it("closes the document sheet when a lock conflict is detected", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(DocsPage));
    });

    const editButton = document.body.querySelector(
      '[data-testid="button-edit-doc"]',
    ) as HTMLButtonElement | null;
    expect(editButton).not.toBeNull();

    await act(async () => {
      editButton?.click();
    });

    expect(document.body.querySelector('[data-testid="input-doc-title"]')).not.toBeNull();
    expect(lockGuardMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        resourceId: "doc-1",
        resourceLabel: "document",
        editorLock: editorLockState,
      }),
    );

    const guardArgs = lockGuardMock.mock.calls.at(-1)?.[0] as { onConflict: () => void };

    await act(async () => {
      guardArgs.onConflict();
    });

    expect(document.body.querySelector('[data-testid="input-doc-title"]')).toBeNull();
  });

  it("submits the edited document through the update mutation", async () => {
    editorLockState.isReadOnly = false;
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(DocsPage));
    });

    const editButton = document.body.querySelector(
      '[data-testid="button-edit-doc"]',
    ) as HTMLButtonElement | null;
    expect(editButton).not.toBeNull();

    await act(async () => {
      editButton?.click();
    });

    const saveButton = document.body.querySelector(
      '[data-testid="button-save-doc"]',
    ) as HTMLButtonElement | null;
    expect(saveButton).not.toBeNull();

    await act(async () => {
      saveButton?.click();
    });

    const calledPayload = mutationStates.flatMap((state) => state.mutate.mock.calls).at(-1)?.[0];
    expect(calledPayload).toEqual(
      expect.objectContaining({
        id: "doc-1",
        title: "Editor Workflow",
        slug: "editor-workflow",
      }),
    );
  });
});
