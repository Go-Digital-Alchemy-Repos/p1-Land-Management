// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import PageManager from "../src/marketing/PageManager";
const state = vi.hoisted(() => ({
  owned: true,
  transport: vi.fn(),
  verify: vi.fn(async () => {}),
  api: Object.fromEntries(
    [
      "listMarketingPages",
      "getMarketingPage",
      "getMarketingPageBuilder",
      "createMarketingPage",
      "updateMarketingPage",
      "duplicateMarketingPage",
      "publishMarketingPage",
      "scheduleMarketingPage",
      "unpublishMarketingPage",
      "deleteMarketingPage",
      "getMarketingPageRelationships",
      "removeMarketingPageMenuItems",
      "listMarketingPageRevisions",
      "restoreMarketingPageRevision",
      "getMarketingPagePreviewLink",
      "acquireMarketingPageReservation",
      "releaseMarketingPageReservation",
    ].map((name) => [name, vi.fn()]),
  ),
}));
vi.mock("@workspace/api-client-react/dashboard", () => state.api);
vi.mock("../../../lib/api-client-react/src/custom-fetch", () => ({
  customFetch: state.transport,
}));
vi.mock("../src/marketing/usePageReservation", () => ({
  pageLeaseTransport: vi.fn(),
  usePageReservation: () => ({
    owned: state.owned,
    verify: state.verify,
    preconditions: async (expectedVersion: number) => ({
      expectedVersion,
      editorInstanceId: "instance",
      leaseId: "lease",
    }),
    acquire: vi.fn(),
    error: "",
    holder: "Other Editor",
  }),
}));
vi.mock("../src/marketing/NativePageBuilder", () => ({
  NativePageBuilder: () => <div>Original canvas slot</div>,
}));
vi.mock("../src/marketing/MediaLibrary", () => ({
  MediaLibrary: () => <div>Media library</div>,
}));
const page = {
  id: "one",
  version: 1,
  title: "Property Care",
  slug: "property-care",
  pageType: "custom",
  template: "full-width",
  status: "draft",
  updatedAt: "2026-09-19T12:00:00Z",
  content: {
    preserved: { future: true },
    blocks: [
      {
        id: "b",
        type: "text",
        props: { text: "Text", futureOption: "keep" },
        isActive: true,
      },
    ],
  },
  seoTitle: "",
  seoDescription: "",
};
describe("CMS page native presentation adapter", () => {
  let root: Root, container: HTMLDivElement;
  beforeEach(() => {
    vi.clearAllMocks();
    state.transport.mockImplementation(
      async (_url: string, options?: RequestInit) => {
        if (options?.method === "PUT") throw Error("Page conflict");
        return [];
      },
    );
    state.owned = true;
    state.verify.mockResolvedValue(undefined);
    Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
    window.history.replaceState({}, "", "/?page=one");
    state.api.getMarketingPage.mockResolvedValue(structuredClone(page));
    state.api.listMarketingPages.mockResolvedValue([structuredClone(page)]);
    state.api.getMarketingPageBuilder.mockResolvedValue({
      blocks: [],
      aliases: {},
      pages: [],
      forms: [],
      galleries: [],
      team: [],
      sidebars: [],
      previewUrl: null,
    });
    state.api.updateMarketingPage.mockRejectedValue(Error("Page conflict"));
    state.api.listMarketingPageRevisions.mockResolvedValue([
      {
        id: "revision",
        title: "Earlier title",
        status: "draft",
        changeNote: "Updated",
        createdAt: "2026-09-18T12:00:00Z",
      },
    ]);
    state.api.getMarketingPageRelationships.mockResolvedValue({
      menuReferences: [],
      counts: { menuItems: 0 },
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.restoreAllMocks();
  });
  const button = (text: string) =>
    Array.from(container.querySelectorAll("button")).find(
      (node) => node.textContent?.trim() === text,
    )!;
  async function render() {
    await act(async () => {
      root.render(<PageManager canUseMedia canUseMenus canUseSections />);
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
  }
  async function click(text: string) {
    await act(async () => button(text).click());
  }
  async function edit(label: string, value: string) {
    const input = Array.from(container.querySelectorAll("label"))
      .find((node) => node.textContent?.includes(label))!
      .querySelector("input")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )!.set!.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  it("restores tabs and canvas slot", async () => {
    await render();
    expect(
      Array.from(container.querySelectorAll('[role="tab"]')).map(
        (x) => x.textContent,
      ),
    ).toEqual(["Builder", "Page Settings", "SEO", "Quality"]);
    expect(container.textContent).toContain("Original canvas slot");
    await click("SEO");
    expect(container.textContent).toContain("Search Engine");
    expect(container.textContent).toContain("Social / Open Graph");
    await click("Quality");
    expect(container.textContent).toContain("Publication Checklist");
  });
  it("retains local edits and unknown content when save fails", async () => {
    await render();
    await click("Page Settings");
    await edit("Page title", "Updated care");
    await click("Save Page");
    expect(state.verify).toHaveBeenCalled();
    expect(state.transport).toHaveBeenCalledWith(
      "/api/v1/marketing/cms/pages/one",
      expect.objectContaining({ method: "PUT" }),
    );
    const write = state.transport.mock.calls.find(
      (call) => call[1]?.method === "PUT",
    )!;
    expect(JSON.parse(write[1].body)).toMatchObject({
      title: "Updated care",
      content: page.content,
      expectedVersion: 1,
      editorInstanceId: "instance",
      leaseId: "lease",
    });
    expect(container.textContent).toContain("Page conflict");
    expect((container.querySelector("input") as HTMLInputElement).value).toBe(
      "Updated care",
    );
  });
  it("blocks publication and restore while dirty", async () => {
    await render();
    await click("Page Settings");
    await edit("Page title", "Changed");
    expect(button("Publish page").disabled).toBe(true);
    await click("View revisions");
    expect(button("Restore revision").disabled).toBe(true);
    expect(state.api.restoreMarketingPageRevision).not.toHaveBeenCalled();
  });
  it("keeps readonly editor navigable", async () => {
    state.owned = false;
    await render();
    expect(button("Save Page").disabled).toBe(true);
    expect(
      container.querySelector<HTMLButtonElement>(
        '[aria-label="Back to CMS pages"]',
      )!.disabled,
    ).toBe(false);
    await click("Page Settings");
    expect(container.querySelector("fieldset")!.disabled).toBe(true);
  });
  it("shows table columns and action controls", async () => {
    window.history.replaceState({}, "", "/");
    await render();
    expect(
      Array.from(container.querySelectorAll("th")).map((x) => x.textContent),
    ).toEqual(["Title", "Slug", "Type", "Status", "Updated", "Actions"]);
    expect(
      container.querySelector('[aria-label="Duplicate Property Care"]'),
    ).not.toBeNull();
  });
  it("preserves draft when navigation declined", async () => {
    await render();
    await click("Page Settings");
    await edit("Page title", "Changed");
    vi.mocked(window.confirm).mockReturnValue(false);
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[aria-label="Back to CMS pages"]')!
        .click(),
    );
    expect(container.textContent).toContain("Changed");
    expect(location.search).toContain("page=one");
  });
  it("uses the original visual template picker without dropping content metadata", async () => {
    HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
    await render();
    await click("Templates");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });
    const card = container.querySelector<HTMLButtonElement>(
      '[data-testid="template-card-blank"]',
    );
    expect(card).not.toBeNull();
    await act(async () => card!.click());
    await click("Start with Blank Page");
    await click("Save Page");
    expect(
      JSON.parse(
        state.transport.mock.calls.find((call) => call[1]?.method === "PUT")![1]
          .body,
      ),
    ).toMatchObject({
      content: { preserved: { future: true }, blocks: [] },
      expectedVersion: 1,
    });
  });
});
