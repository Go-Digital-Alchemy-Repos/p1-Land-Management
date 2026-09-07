// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import AdminFormsPage from "@/features/admin/forms-page";

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const lockGuardMock = vi.fn();
const editorLockState = {
  hasLocking: true,
  hasLoaded: true,
  isReadOnly: true,
  isLoading: false,
  acquire: vi.fn(),
  summary: {
    variant: "warning" as const,
    title: "Form already checked out",
    description: "Jamie Editor is already editing this form.",
  },
};
let mutationStates: Array<{
  mutate: ReturnType<typeof vi.fn>;
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
}> = [];

const mockForms = [
  {
    id: "form-1",
    name: "Contact Form",
    slug: "contact-form",
    description: "Public contact form",
    kind: "contact",
    isSystem: false,
    isActive: true,
    fields: [],
    settings: {
      submitButtonText: "Send",
      successMessage: "Thanks",
    },
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

vi.mock("@/components/shared/protected-route", () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "protected-route" }, children),
}));

vi.mock("@/features/admin/admin-sidebar", () => ({
  AdminSidebar: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "admin-sidebar" }, children),
}));

vi.mock("@/components/shared/editor-lock-banner", () => ({
  EditorLockBanner: ({ title }: { title: string }) =>
    React.createElement("div", { "data-testid": "editor-lock-banner" }, title),
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

describe("AdminFormsPage", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    lockGuardMock.mockReset();
    editorLockState.isReadOnly = true;
    mutationStates = [];
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === "/api/admin/forms") {
        return { data: mockForms, isLoading: false };
      }

      if (queryKey[0] === "/api/admin/forms" && queryKey[2] === "submissions") {
        return { data: [], isLoading: false };
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
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn(),
      },
    } as unknown as Navigator);
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
    document.body.innerHTML = "";
  });

  it("drops out of the builder when a locked form conflict is detected", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(AdminFormsPage));
    });

    expect(document.body.textContent).toContain("Save Form");
    expect(lockGuardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: "form-1",
        resourceLabel: "form",
        editorLock: editorLockState,
      }),
    );

    const guardArgs = lockGuardMock.mock.calls.at(-1)?.[0] as { onConflict: () => void };

    await act(async () => {
      guardArgs.onConflict();
    });

    expect(document.body.textContent).not.toContain("Save Form");
    expect(document.body.textContent).toContain("Form Entries");
  });

  it("submits the active draft through the form save mutation", async () => {
    editorLockState.isReadOnly = false;
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(AdminFormsPage));
    });

    const saveButton = Array.from(document.body.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Save Form"),
    ) as HTMLButtonElement | undefined;
    expect(saveButton).toBeTruthy();

    await act(async () => {
      saveButton?.click();
    });

    const calledPayload = mutationStates.flatMap((state) => state.mutate.mock.calls).at(-1)?.[0];
    expect(calledPayload).toEqual(
      expect.objectContaining({
        id: "form-1",
        name: "Contact Form",
        slug: "contact-form",
      }),
    );
  });
});
