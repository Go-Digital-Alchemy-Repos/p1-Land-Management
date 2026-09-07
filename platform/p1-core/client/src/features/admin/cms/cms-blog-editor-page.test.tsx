// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import CmsBlogEditorPage from "@/features/admin/cms/cms-blog-editor-page";

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
    title: "Post already checked out",
    description: "Jamie Editor is already editing this post.",
  },
};
let mutationStates: Array<{
  mutate: ReturnType<typeof vi.fn>;
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
}> = [];

vi.mock("wouter", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href }, children),
  useLocation: () => ["/admin/cms/blog/post-1", navigateMock],
  useParams: () => ({ id: "post-1" }),
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

vi.mock("@/components/ui/popover", () => {
  const PopoverContext = React.createContext<{
    open: boolean;
    setOpen: (open: boolean) => void;
  }>({
    open: false,
    setOpen: () => undefined,
  });

  return {
    Popover: ({
      open,
      onOpenChange,
      children,
    }: {
      open?: boolean;
      onOpenChange?: (open: boolean) => void;
      children: React.ReactNode;
    }) => {
      const [internalOpen, setInternalOpen] = React.useState(open ?? false);
      const currentOpen = open ?? internalOpen;
      const setOpen = (nextOpen: boolean) => {
        if (open === undefined) {
          setInternalOpen(nextOpen);
        }
        onOpenChange?.(nextOpen);
      };

      return React.createElement(
        PopoverContext.Provider,
        { value: { open: currentOpen, setOpen } },
        children,
      );
    },
    PopoverTrigger: ({
      asChild: _asChild,
      children,
    }: {
      asChild?: boolean;
      children: React.ReactElement<{ onClick?: () => void }>;
    }) => {
      const ctx = React.useContext(PopoverContext);
      const child = React.Children.only(children);
      return React.cloneElement(child, {
        onClick: () => ctx.setOpen(!ctx.open),
      });
    },
    PopoverContent: ({ children }: { children: React.ReactNode }) => {
      const ctx = React.useContext(PopoverContext);
      if (!ctx.open) return null;
      return React.createElement("div", null, children);
    },
  };
});

vi.mock("@/components/shared/blog-editor", () => ({
  BlogEditor: () => React.createElement("div", { "data-testid": "blog-editor" }, "Blog Editor"),
}));

vi.mock("@/components/shared/seo-preview", () => ({
  SeoPreview: () => React.createElement("div", { "data-testid": "seo-preview" }),
}));

vi.mock("@/components/shared/structured-data-status", () => ({
  StructuredDataStatus: () =>
    React.createElement("div", { "data-testid": "structured-data-status" }),
}));

vi.mock("@/features/admin/cms/components/cms-image-upload", () => ({
  CmsImageUpload: () => React.createElement("div", { "data-testid": "cms-image-upload" }),
}));

vi.mock("@/features/admin/cms/components/image-position-picker", () => ({
  ImagePositionPicker: () => React.createElement("div", { "data-testid": "image-position-picker" }),
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

describe("CmsBlogEditorPage", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    navigateMock.mockReset();
    lockGuardMock.mockReset();
    editorLockState.isReadOnly = true;
    mutationStates = [];
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === "/api/admin/cms/sidebars") {
        return { data: [], isLoading: false };
      }

      if (queryKey[0] === "/api/admin/blog/settings/taxonomies") {
        return { data: [], isLoading: false };
      }

      if (queryKey[0] === "/api/admin/blog") {
        return {
          data: {
            id: "post-1",
            title: "Latest Insights",
            slug: "latest-insights",
            authorName: "Admin",
            categories: [],
            tags: [],
            excerpt: "",
            content: "<p>Hello</p>",
            coverImageUrl: "",
            coverImagePositionX: 50,
            coverImagePositionY: 50,
            postType: "article",
            podcastUrl: "",
            externalUrl: "",
            sidebarId: "",
            isPublished: false,
            seoTitle: "",
            seoDescription: "",
            ogImageUrl: "",
            noindex: false,
          },
          isLoading: false,
        };
      }

      return { data: undefined, isLoading: false };
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
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ) as typeof fetch,
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
    document.body.innerHTML = "";
  });

  it("wires lock conflicts back to the blog list and disables saving in read-only mode", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(CmsBlogEditorPage));
    });

    expect(lockGuardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: "post-1",
        resourceLabel: "post",
        editorLock: editorLockState,
      }),
    );

    const guardArgs = lockGuardMock.mock.calls.at(-1)?.[0] as { onConflict: () => void };

    await act(async () => {
      guardArgs.onConflict();
    });

    const saveButton = container.querySelector(
      '[data-testid="button-save-post"]',
    ) as HTMLButtonElement | null;
    expect(saveButton).not.toBeNull();
    expect(saveButton?.disabled).toBe(true);
    expect(navigateMock).toHaveBeenCalledWith("/admin/cms/blog");
  });

  it("submits the existing post through the update mutation", async () => {
    editorLockState.isReadOnly = false;
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(CmsBlogEditorPage));
    });

    const saveButton = container.querySelector(
      '[data-testid="button-save-post"]',
    ) as HTMLButtonElement | null;
    expect(saveButton).not.toBeNull();

    await act(async () => {
      saveButton?.click();
    });

    const calledPayload = mutationStates.flatMap((state) => state.mutate.mock.calls).at(-1)?.[0];
    expect(calledPayload).toEqual(
      expect.objectContaining({
        title: "Latest Insights",
        slug: "latest-insights",
        authorName: "Admin",
      }),
    );
  });

  it("prompts before scheduling when the post has unsaved edits", async () => {
    editorLockState.isReadOnly = false;
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(CmsBlogEditorPage));
    });

    const titleInput = container.querySelector(
      '[data-testid="input-post-title"]',
    ) as HTMLInputElement | null;
    expect(titleInput).not.toBeNull();

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setValue?.call(titleInput, "Updated Insights");
      titleInput!.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const openScheduleButton = container.querySelector(
      '[data-testid="button-open-blog-schedule"]',
    ) as HTMLButtonElement | null;
    expect(openScheduleButton).not.toBeNull();

    await act(async () => {
      openScheduleButton?.click();
    });

    const scheduleInput = document.body.querySelector(
      '[data-testid="input-blog-schedule-date"]',
    ) as HTMLInputElement | null;
    expect(scheduleInput).not.toBeNull();

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setValue?.call(scheduleInput, "2026-05-01T10:30");
      scheduleInput!.dispatchEvent(new Event("input", { bubbles: true }));
      scheduleInput!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const confirmScheduleButton = document.body.querySelector(
      '[data-testid="button-confirm-blog-schedule"]',
    ) as HTMLButtonElement | null;
    expect(confirmScheduleButton).not.toBeNull();
    expect(confirmScheduleButton?.disabled).toBe(false);

    await act(async () => {
      confirmScheduleButton?.click();
    });

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain(
      "You have unsaved changes to this post. Scheduling this post will use the last saved version, not your in-progress edits. Continue?",
    );
    const keepEditingButton = [...document.body.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Keep editing"),
    ) as HTMLButtonElement | undefined;
    expect(keepEditingButton).toBeDefined();
    await act(async () => {
      keepEditingButton?.click();
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
