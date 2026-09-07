// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import CmsSectionEditorPage from "@/features/admin/cms/cms-section-editor-page";

const navigateMock = vi.fn();
const lockGuardMock = vi.fn();
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const editorLockState = {
  hasLocking: true,
  hasLoaded: true,
  isReadOnly: true,
  isLoading: false,
  acquire: vi.fn(),
  summary: {
    variant: "warning" as const,
    title: "Saved section already checked out",
    description: "Jamie Editor is already editing this section.",
  },
};

vi.mock("wouter", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href }, children),
  useLocation: () => ["/admin/cms/sections/section-1", navigateMock],
  useParams: () => ({ id: "section-1" }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (options: unknown) => useQueryMock(options),
    useMutation: (options: unknown) => useMutationMock(options),
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  };
});

vi.mock("@/features/admin/admin-sidebar", () => ({
  AdminSidebar: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "admin-sidebar" }, children),
}));

vi.mock("@/components/shared/editor-lock-banner", () => ({
  EditorLockBanner: ({ title }: { title: string }) =>
    React.createElement("div", { "data-testid": "editor-lock-banner" }, title),
}));

vi.mock("@/features/admin/cms/builder/page-builder", () => ({
  PageBuilder: () => React.createElement("div", { "data-testid": "page-builder" }, "Page Builder"),
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

describe("CmsSectionEditorPage", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    navigateMock.mockReset();
    lockGuardMock.mockReset();
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === "/api/admin/cms/sections") {
        return {
          data: {
            id: "section-1",
            name: "Homepage CTA",
            description: "Saved CTA block",
            category: "cta",
            blocks: [],
          },
          isLoading: false,
        };
      }

      return { data: undefined, isLoading: false };
    });
    useMutationMock.mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
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
    document.body.innerHTML = "";
  });

  it("wires lock conflicts back to the saved sections list and disables saving in read-only mode", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(CmsSectionEditorPage));
    });

    expect(lockGuardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: "section-1",
        resourceLabel: "saved section",
        editorLock: editorLockState,
      }),
    );

    const guardArgs = lockGuardMock.mock.calls.at(-1)?.[0] as { onConflict: () => void };

    await act(async () => {
      guardArgs.onConflict();
    });

    const saveButton = container.querySelector(
      '[data-testid="button-save-section"]',
    ) as HTMLButtonElement | null;
    expect(saveButton).not.toBeNull();
    expect(saveButton?.disabled).toBe(true);
    expect(navigateMock).toHaveBeenCalledWith("/admin/cms/sections");
  });
});
