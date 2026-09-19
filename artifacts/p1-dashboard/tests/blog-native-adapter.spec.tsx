import type { MarketingBlogPublicationPost } from "../../../lib/api-client-react/src/dashboard/models";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import BlogManager from "../src/marketing/BlogManager";
const state = vi.hoisted(() => ({
  api: Object.fromEntries(
    [
      "listMarketingBlogPublications",
      "getMarketingBlogPublication",
      "createMarketingBlogPublication",
      "mutateMarketingBlogPublication",
      "mutateMarketingBlogPublication",
      "getMarketingBlogReferences",
      "listMarketingBlogTaxonomies",
      "uploadMarketingMedia",
      "adoptMarketingBlogPublication",
      "releaseMarketingBlogReservation",
      "listMarketingBlogRevisions",
      "getMarketingBlogPreview",
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
    preconditions: state.verify,
    editorInstanceId: "instance-1",
    acquire: vi.fn(),
  }),
}));
let host: HTMLDivElement, root: Root;
const post: MarketingBlogPublicationPost = {
  id: "post1",
  title: "A retained post",
  slug: "retained",
  authorName: "Owner",
  content: "Original",
  excerpt: null,
  category: null,
  postType: "article",
  podcastUrl: null,
  externalUrl: null,
  seoTitle: null,
  seoDescription: null,
  ogImageUrl: null,
  noindex: false,
  publishedAt: null,
  scheduledAt: null,
  createdAt: "2026-09-19T12:00:00.000Z",
  updatedAt: "2026-09-19T12:00:00.000Z",
  categories: ["Field notes"],
  tags: [],
  isPublished: false,
  sidebarId: "missing-sidebar",
  coverImageUrl: "/cover.jpg",
  coverImagePositionX: 50,
  coverImagePositionY: 50,
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
};
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  state.owned = true;
  state.verify.mockResolvedValue({
    expectedVersion: 3,
    editorInstanceId: "instance-1",
    leaseId: "lease-1",
  });
  state.api.listMarketingBlogPublications.mockResolvedValue([post]);
  state.api.getMarketingBlogPublication.mockResolvedValue(post);
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
  state.api.mutateMarketingBlogPublication.mockImplementation(
    async (_id, payload) => ({
      ...post,
      ...payload.data,
      publication: {
        ...post.publication,
        version: 4,
        ...(payload.action === "schedule"
          ? {
              schedule: {
                id: "schedule1",
                revisionId: "rev3",
                scheduledAt: payload.scheduledAt,
                status: "pending",
                failureCode: null,
              },
            }
          : {}),
      },
    }),
  );
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
  expect(host.textContent).toContain("editorial saves do not publish");
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
  state.api.mutateMarketingBlogPublication.mockRejectedValueOnce(
    Error("Conflict"),
  );
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
it("preserves unavailable sidebar and sends draft-only editorial data with exact proof", async () => {
  await edit();
  await click("Save post");
  expect(state.api.mutateMarketingBlogPublication).toHaveBeenCalledWith(
    "post1",
    expect.objectContaining({
      action: "save",
      expectedVersion: 3,
      editorInstanceId: "instance-1",
      leaseId: "lease-1",
      data: expect.objectContaining({
        sidebarId: "missing-sidebar",
        categories: ["Field notes"],
      }),
    }),
    expect.anything(),
  );
  expect(host.textContent).toContain(
    "Draft saved. Public content is unchanged.",
  );
  const payload = state.api.mutateMarketingBlogPublication.mock.calls[0][1];
  expect(payload.data).not.toHaveProperty("isPublished");
  expect(payload.data).not.toHaveProperty("scheduledAt");
  expect(payload.data).not.toHaveProperty("publishedAt");
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
  expect(state.api.mutateMarketingBlogPublication).toHaveBeenCalledWith(
    "post1",
    expect.objectContaining({
      data: expect.objectContaining({ tags: [], categories: [] }),
    }),
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
  state.api.getMarketingBlogPublication.mockResolvedValueOnce({
    ...post,
    ...dates,
  });
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
  expect(state.api.mutateMarketingBlogPublication).toHaveBeenCalledWith(
    "post1",
    expect.objectContaining({
      action: "save",
      data: expect.objectContaining({ title: "Updated title" }),
    }),
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
  expect(state.api.mutateMarketingBlogPublication).not.toHaveBeenCalled();
});

async function setInput(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      input instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
function namedInput(label: string) {
  return Array.from(host.querySelectorAll("label"))
    .find((l) => l.textContent?.startsWith(label))!
    .querySelector<HTMLInputElement>("input")!;
}
it("requires explicit fingerprint adoption and releases its granted lease before normal reacquire", async () => {
  state.api.getMarketingBlogPublication.mockResolvedValueOnce({
    ...post,
    publication: {
      ...post.publication,
      requiresAdoption: true,
      version: null,
      visibility: "legacy",
    },
  });
  state.api.adoptMarketingBlogPublication.mockResolvedValue({
    ...post,
    lease: { ownedByCurrentEditor: true, lock: { id: "adoption-lease" } },
  });
  await edit();
  expect(host.querySelector("fieldset")?.disabled).toBe(true);
  expect(state.api.adoptMarketingBlogPublication).not.toHaveBeenCalled();
  await setInput(
    namedInput("Adoption reason"),
    "Owner reviewed legacy article",
  );
  await click("Adopt legacy post");
  expect(state.api.adoptMarketingBlogPublication).toHaveBeenCalledWith(
    "post1",
    {
      expectedLegacyFingerprint: "a".repeat(64),
      editorInstanceId: "instance-1",
      reason: "Owner reviewed legacy article",
    },
    expect.anything(),
  );
  expect(state.api.releaseMarketingBlogReservation).toHaveBeenCalledWith(
    "post1",
    { editorInstanceId: "instance-1", leaseId: "adoption-lease" },
  );
});
it("publishes only on explicit action with entered editorial content", async () => {
  await edit();
  await setInput(
    host.querySelector('textarea[aria-label="Post content"]')!,
    "Ready to publish",
  );
  await click("Save & Publish");
  expect(state.api.mutateMarketingBlogPublication).toHaveBeenCalledWith(
    "post1",
    expect.objectContaining({
      action: "publish",
      data: expect.objectContaining({ content: "Ready to publish" }),
    }),
    expect.anything(),
  );
});
it("schedules the saved revision without replacing dirty content, then restores explicitly to draft", async () => {
  await edit();
  await setInput(
    host.querySelector('textarea[aria-label="Post content"]')!,
    "Unsaved future edits",
  );
  await setInput(namedInput("Scheduled publication"), "2099-01-01T12:00");
  await click("Schedule saved revision");
  const payload = state.api.mutateMarketingBlogPublication.mock.calls[0][1];
  expect(payload.action).toBe("schedule");
  expect(payload.scheduledAt).toBe(new Date("2099-01-01T12:00").toISOString());
  expect(payload).not.toHaveProperty("data");
  expect(
    host.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Post content"]',
    )!.value,
  ).toBe("Unsaved future edits");
  state.api.listMarketingBlogRevisions.mockResolvedValue([
    { id: "rev1", version: 1, action: "save" },
  ]);
  await click("Revision history");
  await click("Restore revision 1 to draft");
  expect(state.api.mutateMarketingBlogPublication).toHaveBeenLastCalledWith(
    "post1",
    expect.objectContaining({ action: "restore", revisionId: "rev1" }),
    expect.anything(),
  );
});
it("does not retry an uncertain write or discard dirty text when reload fails", async () => {
  await edit();
  await setInput(
    host.querySelector('textarea[aria-label="Post content"]')!,
    "Keep this draft",
  );
  state.api.mutateMarketingBlogPublication.mockRejectedValueOnce(
    Error("Response lost"),
  );
  await click("Save post");
  await click("Save post");
  expect(state.api.mutateMarketingBlogPublication).toHaveBeenCalledTimes(1);
  state.api.getMarketingBlogPublication.mockRejectedValueOnce(
    Error("Read unavailable"),
  );
  await click("Reload saved draft");
  expect(
    host.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Post content"]',
    )!.value,
  ).toBe("Keep this draft");
  expect(host.textContent).toContain("Read unavailable");
});
it("renders a private saved preview in an inert sandbox and surfaces revision read errors", async () => {
  await edit();
  state.api.getMarketingBlogPreview.mockResolvedValue({
    revisionId: "rev3",
    snapshot: { ...post, content: "<p>Sanitized preview</p>" },
  });
  await click("Preview saved draft");
  expect(host.querySelector("iframe")?.getAttribute("sandbox")).toBe("");
  state.api.listMarketingBlogRevisions.mockRejectedValueOnce(
    Error("Forbidden revisions"),
  );
  await click("Revision history");
  expect(host.textContent).toContain("Forbidden revisions");
});

it("allows correcting deterministic validation failures without reloading the draft", async () => {
  await edit();
  state.api.mutateMarketingBlogPublication.mockRejectedValueOnce(
    Object.assign(Error("Title needs correction"), { status: 400 }),
  );
  await click("Save post");
  expect(host.querySelector("fieldset")?.disabled).toBe(false);
  await setInput(
    host.querySelector('textarea[aria-label="Post content"]')!,
    "Corrected content",
  );
  await click("Save post");
  expect(state.api.mutateMarketingBlogPublication).toHaveBeenCalledTimes(2);
});
