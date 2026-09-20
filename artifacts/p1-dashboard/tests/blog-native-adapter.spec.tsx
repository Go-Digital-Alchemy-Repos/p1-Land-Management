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

const presentationFor = (title: string) => ({
  schemaVersion: 1 as const,
  layout: "editorial" as const,
  eyebrow: "Land care",
  titleParts: [{ text: title, emphasis: true }],
  imageAlt: "A working property",
  relatedContent:
    '<p>Related <a href="/services/land-clearing">land clearing</a>.</p>',
  structuredData: {
    type: "Article" as const,
    headline: "Declared headline",
    description: "Declared description",
    authorType: "Organization" as const,
    publishedDate: "2026-06-24",
    modifiedDate: "2026-09-14",
  },
});

it.each([undefined, null, presentationFor("A retained post")])(
  "roundtrips optional presentation without invention on unrelated saves: %j",
  async (presentation) => {
    state.api.getMarketingBlogPublication.mockResolvedValueOnce({
      ...post,
      ...(presentation !== undefined ? { presentation } : {}),
    });
    await edit();
    await setInput(
      host.querySelector('textarea[aria-label="Post content"]')!,
      "Unrelated body edit",
    );
    await click("Save post");
    const data = state.api.mutateMarketingBlogPublication.mock.calls[0][1].data;
    if (presentation === undefined)
      expect(data).not.toHaveProperty("presentation");
    else expect(data.presentation).toEqual(presentation);
  },
);
it("regenerates only hero title parts after a real title edit and retains date-only organization metadata", async () => {
  const presentation = presentationFor("A retained post");
  state.api.getMarketingBlogPublication.mockResolvedValueOnce({
    ...post,
    presentation,
  });
  await edit();
  await setInput(host.querySelector("input[required]")!, "Changed title");
  await click("Save post");
  const first =
    state.api.mutateMarketingBlogPublication.mock.calls[0][1].data.presentation;
  expect(first).toEqual({
    ...presentation,
    titleParts: [{ text: "Changed title", emphasis: false }],
  });
  await click("Save post");
  expect(
    state.api.mutateMarketingBlogPublication.mock.calls[1][1].data.presentation,
  ).toEqual(first);
});
it("blocks an unsupported presentation version instead of silently dropping it", async () => {
  state.api.getMarketingBlogPublication.mockResolvedValueOnce({
    ...post,
    presentation: { ...presentationFor(post.title), schemaVersion: 99 },
  });
  await edit();
  await click("Save post");
  expect(state.api.mutateMarketingBlogPublication).not.toHaveBeenCalled();
  expect(host.textContent).toContain("unsupported presentation metadata");
});

it("edits presentation in original Layout card, retains chosen emphasis after title edit, and clears explicitly", async () => {
  await edit();
  await setInput(host.querySelector("input[required]")!, "A changed title");
  await click("Layout");
  await act(async () =>
    host
      .querySelector<HTMLInputElement>(
        '[aria-label="Enable editorial presentation"]',
      )!
      .click(),
  );
  await setInput(
    host.querySelector('[aria-label="Hero eyebrow"]')!,
    "Field notes",
  );
  await setInput(
    host.querySelector('[aria-label="Hero image alternative text"]')!,
    "A maintained field",
  );
  await setInput(
    host.querySelector('[aria-label="Exact title phrase to emphasize"]')!,
    "changed",
  );
  await click("Apply emphasis");
  await setInput(
    host.querySelector('[aria-label="Related service HTML"]')!,
    '<p><a href="/services">Property services</a></p>',
  );
  await click("Save post");
  const value =
    state.api.mutateMarketingBlogPublication.mock.calls[0][1].data.presentation;
  expect(value).toMatchObject({
    relatedContent: '<p><a href="/services">Property services</a></p>',
    eyebrow: "Field notes",
    imageAlt: "A maintained field",
    titleParts: [
      { text: "A ", emphasis: false },
      { text: "changed", emphasis: true },
      { text: " title", emphasis: false },
    ],
    structuredData: {
      authorType: "Person",
      publishedDate: null,
      modifiedDate: null,
      headline: "A changed title",
    },
  });
  await act(async () =>
    host
      .querySelector<HTMLInputElement>(
        '[aria-label="Enable editorial presentation"]',
      )!
      .click(),
  );
  await click("Save post");
  expect(
    state.api.mutateMarketingBlogPublication.mock.calls[1][1].data.presentation,
  ).toBeNull();
});
it("rejects reversed declared dates without losing draft and permits clearing a date", async () => {
  state.api.getMarketingBlogPublication.mockResolvedValueOnce({
    ...post,
    presentation: presentationFor(post.title),
  });
  await edit();
  await click("Layout");
  await setInput(
    host.querySelector('[aria-label="Declared modification date"]')!,
    "2020-01-01",
  );
  await click("Save post");
  expect(state.api.mutateMarketingBlogPublication).not.toHaveBeenCalled();
  expect(
    (
      host.querySelector(
        '[aria-label="Declared modification date"]',
      ) as HTMLInputElement
    ).value,
  ).toBe("2020-01-01");
  await setInput(
    host.querySelector('[aria-label="Declared modification date"]')!,
    "",
  );
  await click("Save post");
  expect(
    state.api.mutateMarketingBlogPublication.mock.calls[0][1].data.presentation
      .structuredData.modifiedDate,
  ).toBeNull();
});
it("disables presentation controls without an owned lease", async () => {
  state.api.getMarketingBlogPublication.mockResolvedValueOnce({
    ...post,
    presentation: presentationFor(post.title),
  });
  await edit();
  await click("Layout");
  state.owned = false;
  await act(async () => root.render(<BlogManager canUseMedia={false} />));
  expect(
    host.querySelector<HTMLInputElement>(
      '[aria-label="Enable editorial presentation"]',
    )!.disabled,
  ).toBe(true);
  expect(
    host.querySelector<HTMLInputElement>('[aria-label="Hero eyebrow"]')!
      .disabled,
  ).toBe(true);
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

it.each([undefined, null, coverSet])(
  "preserves optional reviewed cover set on unrelated save: %j",
  async (coverImageSet) => {
    state.api.getMarketingBlogPublication.mockResolvedValueOnce({
      ...post,
      coverImageUrl: coverSet.variants[2].url,
      ...(coverImageSet !== undefined ? { coverImageSet } : {}),
    });
    await edit();
    await setInput(
      host.querySelector("input[required]")!,
      "An unrelated title edit",
    );
    await click("Save post");
    const data = state.api.mutateMarketingBlogPublication.mock.calls[0][1].data;
    if (coverImageSet === undefined)
      expect(data).not.toHaveProperty("coverImageSet");
    else expect(data.coverImageSet).toEqual(coverImageSet);
  },
);
it.each(["/r2/cms/other/new.webp", ""])(
  "clears reviewed cover set when cover changes to %s",
  async (url) => {
    state.api.getMarketingBlogPublication.mockResolvedValueOnce({
      ...post,
      coverImageUrl: coverSet.variants[2].url,
      coverImageSet: coverSet,
    });
    await edit();
    const input = Array.from(
      host.querySelectorAll<HTMLInputElement>("input"),
    ).find((input) => input.value === coverSet.variants[2].url)!;
    await setInput(input, url);
    await click("Save post");
    expect(
      state.api.mutateMarketingBlogPublication.mock.calls[0][1].data,
    ).toMatchObject({ coverImageSet: null, coverImageUrl: url || null });
  },
);

it.each([['comments', 'Comments'], ['settings', 'Comment settings'], ['taxonomy', 'Categories and tags']])('opens the requested Blog tool from tab=%s', async (key, label) => {
  history.replaceState(null, '', '/marketing/content/blog?tab=' + key);
  await mount();
  expect(host.querySelector('nav[aria-label="Blog tools"] [aria-current="page"]')?.textContent).toBe(label);
  expect(state.api.listMarketingBlogPublications).not.toHaveBeenCalled();
});
it('persists tool selection and respects unsaved-navigation cancellation', async () => {
  await mount();
  await click('Comments');
  expect(new URLSearchParams(location.search).get('tab')).toBe('comments');
  const block = (event: Event) => event.preventDefault();
  window.addEventListener('p1:before-navigation', block);
  try {
    await click('Comment settings');
    expect(new URLSearchParams(location.search).get('tab')).toBe('comments');
  } finally { window.removeEventListener('p1:before-navigation', block); }
  await click('Posts');
  expect(new URLSearchParams(location.search).has('tab')).toBe(false);
});
