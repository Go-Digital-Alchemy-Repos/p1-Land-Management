// @vitest-environment jsdom

import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import CmsPageEditorPage from "@/features/admin/cms/cms-page-editor-page";

const navigateMock = vi.fn();
const apiRequestMock = vi.fn();
const leaseTransportMock = vi.fn();
let routeId = "page-1";
const lockGuardMock = vi.fn();
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
let mutationStates: Array<{
  mutate: ReturnType<typeof vi.fn>;
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
  options: any;
}> = [];
const mockPage = {
  version: 1,
  id: "page-1",
  title: "Join the Network",
  slug: "join",
  pageType: "landing",
  template: "full-width",
  sidebarId: null,
  status: "draft",
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  ogImageUrl: "",
  canonicalUrl: "",
  noindex: false,
  content: { blocks: [] },
  updatedAt: "2026-04-16T10:00:00.000Z",
};
const editorLockState = {
  hasLocking: true,
  hasLoaded: true,
  isReadOnly: true,
  isLoading: false,
  acquire: vi.fn(),
  preconditions: vi.fn(async (expectedVersion: number) => ({
    expectedVersion,
    editorInstanceId: "editor-id",
    leaseId: "lease-id",
  })),
  summary: {
    variant: "warning" as const,
    title: "Page already checked out",
    description: "Jamie Editor is already editing this page.",
  },
};

vi.mock("wouter", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href }, children),
  useLocation: () => ["/admin/cms/pages/page-1", navigateMock],
  useParams: () => ({ id: routeId }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQuery: (options: unknown) => useQueryMock(options),
    useMutation: (options: unknown) => useMutationMock(options),
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

vi.mock("@/components/ui/tabs", () => {
  const TabsContext = React.createContext<{
    value: string;
    setValue: (value: string) => void;
  }>({
    value: "",
    setValue: () => undefined,
  });

  return {
    Tabs: ({
      value,
      defaultValue,
      onValueChange,
      children,
    }: {
      value?: string;
      defaultValue?: string;
      onValueChange?: (value: string) => void;
      children: React.ReactNode;
    }) => {
      const [internalValue, setInternalValue] = React.useState(value ?? defaultValue ?? "");
      const currentValue = value ?? internalValue;
      const setValue = (nextValue: string) => {
        if (value === undefined) {
          setInternalValue(nextValue);
        }
        onValueChange?.(nextValue);
      };

      return React.createElement(
        TabsContext.Provider,
        { value: { value: currentValue, setValue } },
        children,
      );
    },
    TabsList: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", null, children),
    TabsTrigger: ({
      value,
      children,
      ...props
    }: {
      value: string;
      children: React.ReactNode;
      [key: string]: unknown;
    }) => {
      const ctx = React.useContext(TabsContext);
      return React.createElement(
        "button",
        {
          type: "button",
          "data-state": ctx.value === value ? "active" : "inactive",
          onClick: () => ctx.setValue(value),
          ...props,
        },
        children,
      );
    },
    TabsContent: ({
      value,
      children,
      ...props
    }: {
      value: string;
      children: React.ReactNode;
      [key: string]: unknown;
    }) => {
      const ctx = React.useContext(TabsContext);
      if (ctx.value !== value) return null;
      return React.createElement("div", props, children);
    },
  };
});

vi.mock("@/features/admin/cms/builder/page-builder", () => ({
  PageBuilder: ({ onChange }: { onChange: (content: unknown) => void }) =>
    React.createElement(
      "div",
      { "data-testid": "page-builder" },
      React.createElement(
        "button",
        {
          "data-testid": "button-builder-change",
          onClick: () =>
            onChange({
              blocks: [
                {
                  id: "cta-1",
                  type: "call-to-action",
                  props: { title: "Builder CTA" },
                },
              ],
            }),
        },
        "Change Builder",
      ),
    ),
}));

vi.mock("@/features/admin/cms/components/template-picker", () => ({
  TemplatePicker: () => null,
}));

vi.mock("@/features/admin/cms/components/landing-page-wizard", () => ({
  LandingPageWizard: () => null,
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

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-editor-lock", () => ({
  useEditorLock: () => editorLockState,
  pageLeaseTransport: (...args: unknown[]) => leaseTransportMock(...args),
}));

vi.mock("@/hooks/use-lock-conflict-guard", () => ({
  useLockConflictGuard: (args: unknown) => lockGuardMock(args),
}));

vi.mock("@/lib/cms-page-quality", () => ({
  analyzeCmsPageQuality: () => [],
}));

vi.mock("@/lib/queryClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/queryClient")>()),
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}));

describe("CmsPageEditorPage", () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  beforeEach(() => {
    routeId = "page-1";
    apiRequestMock.mockReset();
    leaseTransportMock.mockReset();
    navigateMock.mockReset();
    lockGuardMock.mockReset();
    editorLockState.isReadOnly = true;
    mutationStates = [];
    useQueryMock.mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      if (queryKey[0] === "/api/admin/cms/sidebars") {
        return { data: [], isLoading: false };
      }

      if (queryKey[0] === "/api/admin/cms/pages" && queryKey[2] === "revisions") {
        return { data: [], isLoading: false };
      }

      if (queryKey[0] === "/api/admin/cms/pages" && queryKey[2] === "relationships") {
        return { data: { menuReferences: [], counts: { menuItems: 0 } }, isLoading: false };
      }

      if (queryKey[0] === "/api/admin/cms/pages") {
        return {
          data: mockPage,
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
    useMutationMock.mockImplementation((options) => {
      const state = {
        options,
        mutate: vi.fn(),
        mutateAsync: vi.fn(),
        isPending: false,
      };
      mutationStates.push(state);
      return state;
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

  it("retains the page on lock conflict and disables saving in read-only mode", async () => {
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(CmsPageEditorPage));
    });

    expect(lockGuardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: "page-1",
        resourceLabel: "page",
        editorLock: editorLockState,
      }),
    );

    const guardArgs = lockGuardMock.mock.calls.at(-1)?.[0] as { onConflict: () => void };
    expect(guardArgs).toBeTruthy();

    await act(async () => {
      guardArgs.onConflict();
    });

    const saveButton = container.querySelector(
      '[data-testid="button-save"]',
    ) as HTMLButtonElement | null;
    expect(saveButton).not.toBeNull();
    expect(saveButton?.disabled).toBe(true);
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("saves combined builder and settings changes through the update mutation", async () => {
    editorLockState.isReadOnly = false;
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(CmsPageEditorPage));
    });

    const builderChangeButton = container.querySelector(
      '[data-testid="button-builder-change"]',
    ) as HTMLButtonElement | null;
    expect(builderChangeButton).not.toBeNull();

    await act(async () => {
      builderChangeButton?.click();
    });

    const settingsTab = container.querySelector(
      '[data-testid="tab-settings"]',
    ) as HTMLButtonElement | null;
    expect(settingsTab).not.toBeNull();

    await act(async () => {
      settingsTab?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const titleInput = container.querySelector(
      '[data-testid="input-title"]',
    ) as HTMLInputElement | null;
    expect(titleInput).not.toBeNull();

    await act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setValue?.call(titleInput, "Updated Join the Network");
      titleInput!.dispatchEvent(new Event("input", { bubbles: true }));
      titleInput!.dispatchEvent(new Event("change", { bubbles: true }));
    });

    const saveButton = container.querySelector(
      '[data-testid="button-save"]',
    ) as HTMLButtonElement | null;
    expect(saveButton).not.toBeNull();

    await act(async () => {
      saveButton?.click();
    });

    const updatePayload = mutationStates.flatMap((state) => state.mutate.mock.calls).at(-1)?.[0];
    expect(updatePayload).toEqual(
      expect.objectContaining({
        title: "Updated Join the Network",
        slug: "join",
        content: {
          blocks: [
            expect.objectContaining({
              id: "cta-1",
              type: "call-to-action",
            }),
          ],
        },
      }),
    );
  });

  it("publishes current unsaved page edits in the save-and-publish payload", async () => {
    editorLockState.isReadOnly = false;
    root = createRoot(container);

    await act(async () => {
      root!.render(React.createElement(CmsPageEditorPage));
    });

    const builderChangeButton = container.querySelector(
      '[data-testid="button-builder-change"]',
    ) as HTMLButtonElement | null;
    await act(async () => {
      builderChangeButton?.click();
    });

    const publishButton = container.querySelector(
      '[data-testid="button-publish"]',
    ) as HTMLButtonElement | null;
    expect(publishButton).not.toBeNull();

    await act(async () => {
      publishButton?.click();
    });

    const publishPayload = mutationStates.flatMap((state) => state.mutate.mock.calls).at(-1)?.[0];
    expect(publishPayload).toEqual(
      expect.objectContaining({
        content: {
          blocks: [
            expect.objectContaining({
              id: "cta-1",
              type: "call-to-action",
            }),
          ],
        },
      }),
    );
  });
  it("uses saved version for publish and retains the draft after stale publication", async () => {
    editorLockState.isReadOnly = false;
    root = createRoot(container);
    await act(async () => {
      root!.render(React.createElement(CmsPageEditorPage));
    });
    await act(async () => {
      (
        container.querySelector('[data-testid="button-builder-change"]') as HTMLButtonElement
      ).click();
    });
    await act(async () => {
      (container.querySelector('[data-testid="button-publish"]') as HTMLButtonElement).click();
    });
    const state = mutationStates.filter((state) => state.mutate.mock.calls.length).at(-1)!;
    const payload = state.mutate.mock.calls.at(-1)![0];
    apiRequestMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...mockPage, version: 2 })))
      .mockRejectedValueOnce(Error("CMS_PAGE_STALE"));
    await expect(state.options.mutationFn(payload)).rejects.toThrow("CMS_PAGE_STALE");
    expect(apiRequestMock.mock.calls[0][2]).toMatchObject({ expectedVersion: 1 });
    expect(apiRequestMock.mock.calls[1][2]).toEqual({
      expectedVersion: 2,
      editorInstanceId: "editor-id",
      leaseId: "lease-id",
    });
    expect(navigateMock).not.toHaveBeenCalled();
    await act(async () => {
      (container.querySelector('[data-testid="button-save"]') as HTMLButtonElement).click();
    });
    expect(
      mutationStates.flatMap((state) => state.mutate.mock.calls).at(-1)![0].content.blocks[0].id,
    ).toBe("cta-1");
  });
  it("opens the created draft when publication lease acquisition fails", async () => {
    routeId = "new";
    editorLockState.isReadOnly = false;
    root = createRoot(container);
    await act(async () => {
      root!.render(React.createElement(CmsPageEditorPage));
    });
    apiRequestMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ...mockPage, id: "created", version: 1 })),
    );
    leaseTransportMock.mockRejectedValueOnce(Error("Network unavailable"));
    await expect(
      mutationStates[2].options.mutationFn({ ...mockPage, content: { blocks: [] } }),
    ).rejects.toThrow("Network unavailable");
    expect(navigateMock).toHaveBeenCalledWith("/admin/cms/pages/created");
    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    expect(leaseTransportMock).toHaveBeenCalledTimes(1);
  });
  it("makes editing controls disabled and inert while saving without hiding tabs", async () => {
    editorLockState.isReadOnly = false;
    useMutationMock.mockImplementation((options) => ({
      options,
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: true,
    }));
    root = createRoot(container);
    await act(async () => {
      root!.render(React.createElement(CmsPageEditorPage));
    });
    const builder = container.querySelector(
      '[data-testid="button-builder-change"]',
    ) as HTMLButtonElement;
    expect(builder.closest("fieldset")?.disabled).toBe(true);
    expect(builder.closest("fieldset")?.hasAttribute("inert")).toBe(true);
    const settings = container.querySelector('[data-testid="tab-settings"]') as HTMLButtonElement;
    expect(settings.closest("fieldset")).toBeNull();
    await act(async () => settings.click());
    const input = container.querySelector('[data-testid="input-title"]') as HTMLInputElement;
    expect(input.closest("fieldset")?.disabled).toBe(true);
    expect(input.closest("fieldset")?.hasAttribute("inert")).toBe(true);
  });
});
