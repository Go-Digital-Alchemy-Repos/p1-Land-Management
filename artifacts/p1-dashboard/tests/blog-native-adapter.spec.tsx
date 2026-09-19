import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import BlogManager from "../src/marketing/BlogManager";
const state = vi.hoisted(() => ({
  api: Object.fromEntries(
    [
      "listMarketingBlog",
      "getMarketingBlog",
      "createMarketingBlog",
      "updateMarketingBlog",
      "deleteMarketingBlog",
      "getMarketingBlogReferences",
      "listMarketingBlogTaxonomies",
      "uploadMarketingMedia",
    ].map((name) => [name, vi.fn()]),
  ),
  verify: vi.fn(),
  owned: true,
}));
vi.mock("@workspace/api-client-react/dashboard", () => state.api);
vi.mock("../src/marketing/BlogSettings", () => ({
  BlogTaxonomies: () => null,
  BlogComments: () => null,
  BlogCommentSettings: () => null,
}));
vi.mock("../src/marketing/CmsRichTextEditor", () => ({
  CmsRichTextEditor: ({ value, onChange }: any) => (
    <textarea
      aria-label="Post content"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));
vi.mock("../src/marketing/MediaLibrary", () => ({
  MediaLibrary: () => <div>Media library adapter</div>,
}));
vi.mock("../src/marketing/useCmsUnsavedChanges", () => ({
  useCmsUnsavedChanges: vi.fn(),
}));
vi.mock("../src/marketing/useBlogReservation", () => ({
  useBlogReservation: () => ({
    owned: state.owned,
    verify: state.verify,
    acquire: vi.fn(),
  }),
}));
let host: HTMLDivElement, root: Root;
const post = {
  id: "post1",
  title: "A retained post",
  slug: "retained",
  authorName: "Owner",
  content: "Original",
  categories: ["Field notes"],
  tags: [],
  isPublished: false,
  sidebarId: "missing-sidebar",
  coverImageUrl: "/cover.jpg",
  coverImagePositionX: 50,
  coverImagePositionY: 50,
};
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  state.owned = true;
  state.verify.mockResolvedValue(undefined);
  state.api.listMarketingBlog.mockResolvedValue([post]);
  state.api.getMarketingBlog.mockResolvedValue(post);
  state.api.getMarketingBlogReferences.mockResolvedValue({
    sidebars: [],
    galleries: [],
  });
  state.api.listMarketingBlogTaxonomies.mockResolvedValue([
    {
      id: "term1",
      type: "category",
      name: "Field notes",
      slug: "field-notes",
      parentId: null,
    },
  ]);
  state.api.updateMarketingBlog.mockImplementation(async (_id, payload) => ({
    ...post,
    ...payload,
  }));
  window.history.replaceState({}, "", "/");
  vi.spyOn(window, "confirm").mockReturnValue(true);
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});
async function mount(media = false) {
  await act(async () => root.render(<BlogManager canUseMedia={media} />));
}
async function click(text: string) {
  const button = Array.from(host.querySelectorAll("button")).find(
    (b) =>
      b.textContent?.trim() === text || b.getAttribute("aria-label") === text,
  );
  expect(button).toBeTruthy();
  await act(async () => button!.click());
}
async function edit() {
  await mount();
  await click("Edit A retained post");
}
it("retains original cards and tabs without inventing public links", async () => {
  await edit();
  expect(host.textContent).toContain("Post Details");
  expect(host.textContent).toContain("Cover Image");
  expect(host.querySelectorAll("[role=tab]")).toHaveLength(3);
  expect(host.querySelector("a[href*=retained]")).toBeNull();
  await click("Layout");
  expect(host.textContent).toContain("Sidebar Layout");
  expect(host.textContent).toContain("Saved sidebar (unavailable)");
  await click("SEO");
  expect(host.textContent).toContain(
    "Publishing a CMS post does not create a public P1 blog route",
  );
  expect(host.textContent).toContain("Structured Data");
});
it("keeps dirty content across tab changes and failed save with reservation verification", async () => {
  await edit();
  const input = host.querySelector<HTMLTextAreaElement>(
    'textarea[aria-label="Post content"]',
  )!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!.call(input, "Local draft");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await click("SEO");
  await click("Content");
  expect(
    host.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Post content"]',
    )!.value,
  ).toBe("Local draft");
  state.api.updateMarketingBlog.mockRejectedValueOnce(Error("Conflict"));
  await click("Save post");
  expect(state.verify).toHaveBeenCalled();
  expect(host.textContent).toContain("Conflict");
  expect(
    host.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Post content"]',
    )!.value,
  ).toBe("Local draft");
});
it("denies image actions without media grant and editing without reservation", async () => {
  state.owned = false;
  await edit();
  expect(host.querySelector("fieldset")?.disabled).toBe(true);
  expect(host.textContent).not.toContain("Pick from library");
  expect(state.api.uploadMarketingMedia).not.toHaveBeenCalled();
});

it("validates image uploads before transport and hides native file controls", async () => {
  await mount(true);
  await click("Edit A retained post");
  const input = host.querySelector<HTMLInputElement>("input[type=file]")!;
  expect(input.hidden).toBe(true);
  await act(async () => {
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [new File(["bad"], "document.txt", { type: "text/plain" })],
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(host.textContent).toContain(
    "Choose a PNG, JPEG, WebP or GIF image up to 10 MB.",
  );
  expect(state.api.uploadMarketingMedia).not.toHaveBeenCalled();
});
it("preserves unavailable sidebar and publication dates during save", async () => {
  await edit();
  await click("Save post");
  expect(state.api.updateMarketingBlog).toHaveBeenCalledWith(
    "post1",
    expect.objectContaining({
      sidebarId: "missing-sidebar",
      categories: ["Field notes"],
      isPublished: false,
      scheduledAt: null,
    }),
    expect.anything(),
  );
  expect(host.textContent).toContain("Post saved.");
});
it("can remove a newly added or unavailable taxonomy name before saving", async () => {
  state.api.listMarketingBlogTaxonomies.mockResolvedValueOnce([]);
  await edit();
  const input = host.querySelector<HTMLInputElement>(
    'input[list="blog-tags"]',
  )!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "Typo tag");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await click("Add tag");
  await click("Remove tag Typo tag");
  expect(host.textContent).not.toContain("Typo tag");
  await click("Remove category Field notes");
  await click("Save post");
  expect(state.api.updateMarketingBlog).toHaveBeenCalledWith(
    "post1",
    expect.objectContaining({ tags: [], categories: [] }),
    expect.anything(),
  );
});
it.each([
  {
    isPublished: false,
    scheduledAt: "2099-01-01T12:00:00.000Z",
    publishedAt: null,
  },
  {
    isPublished: true,
    scheduledAt: null,
    publishedAt: "2026-01-01T12:00:00.000Z",
  },
])("retains publication timestamps after ordinary edits: %j", async (dates) => {
  state.api.getMarketingBlog.mockResolvedValueOnce({ ...post, ...dates });
  await edit();
  const title = host.querySelector<HTMLInputElement>("input[required]")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(title, "Updated title");
    title.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await click("Save post");
  expect(state.api.updateMarketingBlog).toHaveBeenCalledWith(
    "post1",
    expect.objectContaining({ ...dates, title: "Updated title" }),
    expect.anything(),
  );
});
it("blocks saving during upload and stages the returned URL without auto-saving", async () => {
  let finish!: (value: any) => void;
  state.api.uploadMarketingMedia.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await mount(true);
  await click("Edit A retained post");
  const input = host.querySelector<HTMLInputElement>("input[type=file]")!;
  await act(async () => {
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [new File(["image"], "photo.png", { type: "image/png" })],
    });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(host.querySelector("fieldset")?.disabled).toBe(true);
  expect(
    Array.from(host.querySelectorAll("button")).find(
      (b) => b.textContent === "Blog",
    )?.disabled,
  ).toBe(true);
  await act(async () => finish({ url: "/new.png" }));
  expect(host.querySelector("fieldset")?.disabled).toBe(false);
  expect(
    host
      .querySelector<HTMLImageElement>('img[alt="Cover Image preview"]')
      ?.getAttribute("src"),
  ).toContain("/new.png");
  expect(state.api.updateMarketingBlog).not.toHaveBeenCalled();
});
