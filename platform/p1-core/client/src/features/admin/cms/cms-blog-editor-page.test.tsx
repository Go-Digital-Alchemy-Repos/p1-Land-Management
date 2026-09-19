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
  editorInstanceId: "instance-1",
  preconditions: vi.fn(async (version: number) => ({
    expectedVersion: version,
    editorInstanceId: "instance-1",
    leaseId: "lease-1",
  })),
  summary: {
    variant: "warning" as const,
    title: "Post already checked out",
    description: "Jamie Editor is already editing this post.",
  },
};
let mutationOptions: any[] = [];
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
    mutationOptions = [];
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === "/api/admin/cms/sidebars") {
        return { data: [], isLoading: false };
      }

      if (queryKey[0] === "/api/admin/blog/settings/taxonomies") {
        return { data: [], isLoading: false };
      }

      if (queryKey[0] === "/api/admin/blog/publications") {
        return {
          data: {
            publication: {
              requiresAdoption: false,
              version: 3,
              legacyFingerprint: "a".repeat(64),
              visibility: "unpublished",
              schedule: null,
              draftRevisionId: "rev3",
              publishedRevisionId: null,
              lastPublishedRevisionId: null,
              publicationGeneration: 0,
            },
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
            scheduledAt: null,
            publishedAt: null,
            createdAt: "2026-09-19T12:00:00.000Z",
            updatedAt: "2026-09-19T12:00:00.000Z",
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
    useMutationMock.mockImplementation((options: any) => {
      mutationOptions.push(options);
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

  it("retains the editor instead of navigating away on lock conflicts and disables saving in read-only mode", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(CmsBlogEditorPage));
    });

    expect(lockGuardMock).not.toHaveBeenCalled();
    const saveButton = container.querySelector(
      '[data-testid="button-save-post"]',
    ) as HTMLButtonElement | null;
    expect(saveButton).not.toBeNull();
    expect(saveButton?.disabled).toBe(true);
    expect(navigateMock).not.toHaveBeenCalled();
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
        action: "save",
        data: expect.objectContaining({
          title: "Latest Insights",
          slug: "latest-insights",
          authorName: "Admin",
        }),
      }),
    );
  });

  it("confirms the saved-revision schedule and does not submit when declined", async () => {
    editorLockState.isReadOnly = false;
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    root = createRoot(container);
    await act(async () => root!.render(React.createElement(CmsBlogEditorPage)));
    const input = container.querySelector<HTMLInputElement>('input[type="datetime-local"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        input,
        "2099-05-01T10:30",
      );
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const button = [...container.querySelectorAll("button")].find(
      (b) => b.textContent === "Schedule saved revision",
    )!;
    await act(async () => button.click());
    expect(confirmSpy).toHaveBeenCalledWith(
      expect.stringContaining("later draft saves do not change"),
    );
    expect(mutationStates.flatMap((s) => s.mutate.mock.calls)).toHaveLength(0);
  });
  it("sends only editorial fields and exact version lease proof for ordinary save", async () => {
    editorLockState.isReadOnly = false;
    root = createRoot(container);
    await act(async () => root!.render(React.createElement(CmsBlogEditorPage)));
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-testid="button-save-post"]')!.click(),
    );
    const variables = mutationStates.flatMap((s) => s.mutate.mock.calls).at(-1)![0];
    const publication = mutationOptions.filter((o) => o.onSuccess && o.onError).at(-2);
    const currentPost = useQueryMock({ queryKey: ["/api/admin/blog/publications"] }).data;
    const response = { ...currentPost, publication: { ...currentPost.publication, version: 4 } };
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(response), { status: 200 }));
    await act(async () => publication.mutationFn(variables));
    const call = vi.mocked(fetch).mock.calls.at(-1)!;
    expect(call[0]).toBe("/api/admin/blog/publications/post-1/actions");
    const body = JSON.parse(call[1]!.body as string);
    expect(body).toMatchObject({
      action: "save",
      expectedVersion: 3,
      editorInstanceId: "instance-1",
      leaseId: "lease-1",
    });
    expect(body.data).not.toHaveProperty("isPublished");
    expect(body.data).not.toHaveProperty("scheduledAt");
  });
  it("preserves entered title after a conflict and permits correction after validation failure", async () => {
    editorLockState.isReadOnly = false;
    root = createRoot(container);
    await act(async () => root!.render(React.createElement(CmsBlogEditorPage)));
    const input = container.querySelector<HTMLInputElement>('[data-testid="input-post-title"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        input,
        "Keep entered title",
      );
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () =>
      mutationOptions[0].onError(Object.assign(Error("Conflict"), { status: 409 })),
    );
    expect(input.value).toBe("Keep entered title");
    expect(
      container.querySelector<HTMLButtonElement>('[data-testid="button-save-post"]')!.disabled,
    ).toBe(true);
    await act(async () =>
      mutationOptions[0].onError(Object.assign(Error("Invalid title"), { status: 400 })),
    );
    expect(
      container.querySelector<HTMLButtonElement>('[data-testid="button-save-post"]')!.disabled,
    ).toBe(false);
    expect(input.value).toBe("Keep entered title");
  });
});
