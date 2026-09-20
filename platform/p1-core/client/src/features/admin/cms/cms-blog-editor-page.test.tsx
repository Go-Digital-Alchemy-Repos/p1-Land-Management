// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import CmsBlogEditorPage from "@/features/admin/cms/cms-blog-editor-page";

const presentationFor = (title: string) => ({
  schemaVersion: 1 as const,
  layout: "editorial" as const,
  eyebrow: "Land care",
  titleParts: [{ text: title, emphasis: true }],
  imageAlt: "A working property",
  relatedContent: '<p>Related <a href="/services/land-clearing">land clearing</a>.</p>',
  structuredData: {
    type: "Article" as const,
    headline: "Declared headline",
    description: "Declared description",
    authorType: "Organization" as const,
    publishedDate: "2026-06-24",
    modifiedDate: "2026-09-14",
  },
});

const coverSet = {
  schemaVersion: 1 as const,
  sourceFingerprint: "a".repeat(64),
  mediaReviewSha256: "b".repeat(64),
  original: {
    mediaId: "source",
    url: "/r2/cms/review/source.png",
    sha256: "c".repeat(64),
    bytes: 1000,
    mime: "image/png" as const,
    width: 1408,
    height: 768,
    quality: null,
  },
  defaultMediaId: "image1280",
  variants: [480, 768, 1280].map((width) => ({
    mediaId: `image${width}`,
    url: `/r2/cms/review/image-${width}.webp`,
    sha256: "d".repeat(64),
    bytes: 100,
    mime: "image/webp" as const,
    width,
    height: Math.round((768 * width) / 1408),
    quality: 80,
  })),
};

let loadedCoverSet: typeof coverSet | null | undefined;
let loadedPresentation: ReturnType<typeof presentationFor> | null | undefined;
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
  CmsImageUpload: ({ value, onChange }: any) =>
    React.createElement("input", {
      "data-testid": "cms-image-upload",
      value,
      onChange: (event: any) => onChange(event.target.value),
    }),
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
    loadedPresentation = undefined;
    loadedCoverSet = undefined;
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
            ...(loadedPresentation !== undefined ? { presentation: loadedPresentation } : {}),
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
            coverImageUrl: loadedCoverSet ? loadedCoverSet.variants[2].url : "",
            ...(loadedCoverSet !== undefined ? { coverImageSet: loadedCoverSet } : {}),
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
  it.each([undefined, null, presentationFor("Latest Insights")])(
    "preserves optional presentation on unrelated title-unchanged saves: %j",
    async (presentation) => {
      loadedPresentation = presentation;
      editorLockState.isReadOnly = false;
      root = createRoot(container);
      await act(async () => root!.render(React.createElement(CmsBlogEditorPage)));
      await act(async () =>
        container.querySelector<HTMLButtonElement>('[data-testid="button-save-post"]')!.click(),
      );
      const variables = mutationStates.flatMap((s) => s.mutate.mock.calls).at(-1)![0];
      const handler = mutationOptions.filter((o) => o.onSuccess && o.onError).at(-2);
      await act(async () => handler.mutationFn(variables));
      const data = JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string).data;
      if (presentation === undefined) expect(data).not.toHaveProperty("presentation");
      else expect(data.presentation).toEqual(presentation);
    },
  );
  it("regenerates changed title parts and adopts returned metadata for the next unchanged save", async () => {
    loadedPresentation = presentationFor("Latest Insights");
    editorLockState.isReadOnly = false;
    root = createRoot(container);
    await act(async () => root!.render(React.createElement(CmsBlogEditorPage)));
    const input = container.querySelector<HTMLInputElement>('[data-testid="input-post-title"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        input,
        "Changed title",
      );
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-testid="button-save-post"]')!.click(),
    );
    const variables = mutationStates.flatMap((s) => s.mutate.mock.calls).at(-1)![0];
    const handler = mutationOptions.filter((o) => o.onSuccess && o.onError).at(-2);
    const current = useQueryMock({ queryKey: ["/api/admin/blog/publications"] }).data;
    const normalized = {
      ...loadedPresentation,
      titleParts: [{ text: "Changed title", emphasis: false }],
    };
    const result = {
      ...current,
      title: "Changed title",
      presentation: normalized,
      publication: { ...current.publication, version: 4 },
    };
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(result), { status: 200 }));
    let returned: any;
    await act(async () => {
      returned = await handler.mutationFn(variables);
    });
    expect(
      JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string).data.presentation,
    ).toEqual(normalized);
    await act(async () => handler.onSuccess(returned, variables));
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-testid="button-save-post"]')!.click(),
    );
    const second = mutationStates.flatMap((s) => s.mutate.mock.calls).at(-1)![0];
    expect(second.data.presentation).toEqual(normalized);
  });
  async function editPresentationField(label: string, value: string) {
    const input = container.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  async function openLayout() {
    await act(async () => {
      container
        .querySelector<HTMLElement>('[data-testid="tab-layout"]')!
        .dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
    });
  }
  it("edits shared presentation controls and preserves selected emphasis after changing title, then explicitly clears", async () => {
    editorLockState.isReadOnly = false;
    root = createRoot(container);
    await act(async () => root!.render(React.createElement(CmsBlogEditorPage)));
    const title = container.querySelector<HTMLInputElement>('[data-testid="input-post-title"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
        title,
        "New article title",
      );
      title.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await openLayout();
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="Enable editorial presentation"]')!
        .click(),
    );
    await editPresentationField("Hero eyebrow", "Field notes");
    await editPresentationField("Exact title phrase to emphasize", "article");
    await act(async () =>
      Array.from(container.querySelectorAll("button"))
        .find((b) => b.textContent === "Apply emphasis")!
        .click(),
    );
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-testid="button-save-post"]')!.click(),
    );
    const variables = mutationStates.flatMap((s) => s.mutate.mock.calls).at(-1)![0];
    expect(variables.data.presentation).toMatchObject({
      eyebrow: "Field notes",
      titleParts: [
        { text: "New ", emphasis: false },
        { text: "article", emphasis: true },
        { text: " title", emphasis: false },
      ],
      structuredData: { authorType: "Person", publishedDate: null, modifiedDate: null },
    });
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="Enable editorial presentation"]')!
        .click(),
    );
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-testid="button-save-post"]')!.click(),
    );
    expect(
      mutationStates.flatMap((s) => s.mutate.mock.calls).at(-1)![0].data.presentation,
    ).toBeNull();
  });
  it("retains invalid declared date draft without a mutation and permits clearing", async () => {
    loadedPresentation = presentationFor("Latest Insights");
    editorLockState.isReadOnly = false;
    root = createRoot(container);
    await act(async () => root!.render(React.createElement(CmsBlogEditorPage)));
    await openLayout();
    await editPresentationField("Declared modification date", "2020-01-01");
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-testid="button-save-post"]')!.click(),
    );
    const invalidVariables = mutationStates.flatMap((s) => s.mutate.mock.calls).at(-1)![0];
    const handler = mutationOptions.filter((o) => o.onSuccess && o.onError).at(-2);
    await expect(handler.mutationFn(invalidVariables)).rejects.toThrow(
      "unsupported presentation metadata",
    );
    expect(fetch).not.toHaveBeenCalled();
    expect(
      (container.querySelector('[aria-label="Declared modification date"]') as HTMLInputElement)
        .value,
    ).toBe("2020-01-01");
    await editPresentationField("Declared modification date", "");
    await act(async () =>
      container.querySelector<HTMLButtonElement>('[data-testid="button-save-post"]')!.click(),
    );
    expect(
      mutationStates.flatMap((s) => s.mutate.mock.calls).at(-1)![0].data.presentation.structuredData
        .modifiedDate,
    ).toBeNull();
  });
  it("disables presentation controls when another editor owns the lease", async () => {
    loadedPresentation = presentationFor("Latest Insights");
    root = createRoot(container);
    await act(async () => root!.render(React.createElement(CmsBlogEditorPage)));
    await openLayout();
    expect(
      container.querySelector<HTMLButtonElement>('[aria-label="Enable editorial presentation"]')!
        .disabled,
    ).toBe(true);
    expect(container.querySelector<HTMLInputElement>('[aria-label="Hero eyebrow"]')!.disabled).toBe(
      true,
    );
    expect(
      container.querySelector<HTMLTextAreaElement>('[aria-label="Related service HTML"]')!.disabled,
    ).toBe(true);
  });
  it.each([undefined, null, coverSet])(
    "preserves optional reviewed cover metadata: %j",
    async (coverImageSet) => {
      loadedCoverSet = coverImageSet;
      editorLockState.isReadOnly = false;
      root = createRoot(container);
      await act(async () => root!.render(React.createElement(CmsBlogEditorPage)));
      await act(async () =>
        container.querySelector<HTMLButtonElement>('[data-testid="button-save-post"]')!.click(),
      );
      const variables = mutationStates.flatMap((s) => s.mutate.mock.calls).at(-1)![0];
      const handler = mutationOptions.filter((o) => o.onSuccess && o.onError).at(-2);
      await handler.mutationFn(variables);
      const data = JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string).data;
      if (coverImageSet === undefined) expect(data).not.toHaveProperty("coverImageSet");
      else expect(data.coverImageSet).toEqual(coverImageSet);
    },
  );
  it.each(["/r2/cms/other/new.webp", ""])(
    "clears reviewed set on cover selection or clearing: %s",
    async (url) => {
      loadedCoverSet = coverSet;
      editorLockState.isReadOnly = false;
      root = createRoot(container);
      await act(async () => root!.render(React.createElement(CmsBlogEditorPage)));
      const input = container.querySelector<HTMLInputElement>('[data-testid="cms-image-upload"]')!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, url);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });
      await act(async () =>
        container.querySelector<HTMLButtonElement>('[data-testid="button-save-post"]')!.click(),
      );
      const variables = mutationStates.flatMap((s) => s.mutate.mock.calls).at(-1)![0];
      const handler = mutationOptions.filter((o) => o.onSuccess && o.onError).at(-2);
      await handler.mutationFn(variables);
      expect(JSON.parse(vi.mocked(fetch).mock.calls.at(-1)![1]!.body as string).data).toMatchObject(
        { coverImageSet: null, coverImageUrl: url || null },
      );
    },
  );
});
