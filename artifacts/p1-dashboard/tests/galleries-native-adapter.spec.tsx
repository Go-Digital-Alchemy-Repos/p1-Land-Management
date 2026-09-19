import { GalleryPresentation } from "../../../platform/p1-core/client/src/features/admin/cms/builder/gallery-presentation";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import GalleryManager from "../src/marketing/GalleryManager";
const api = vi.hoisted(() =>
  Object.fromEntries(
    [
      "uploadMarketingMedia",
      "listMarketingGalleries",
      "getMarketingGallery",
      "createMarketingGallery",
      "updateMarketingGallery",
      "deleteMarketingGallery",
      "duplicateMarketingGallery",
      "publishMarketingGallery",
      "unpublishMarketingGallery",
    ].map((k) => [k, vi.fn()]),
  ),
);
vi.mock("@workspace/api-client-react/dashboard", () => api);
vi.mock("../src/marketing/MediaLibrary", () => ({
  MediaLibrary: () => <div>Media fixture</div>,
}));
vi.mock("../src/marketing/useCmsUnsavedChanges", () => ({
  useCmsUnsavedChanges: vi.fn(),
}));
const gallery = {
  id: "gallery-one",
  title: "Synthetic Gallery",
  slug: "synthetic-gallery",
  description: "Local fixture",
  status: "draft",
  layout: "grid",
  imageCount: 2,
  settings: {
    columnsDesktop: 3,
    columnsTablet: 2,
    columnsMobile: 1,
    spacing: "md",
    imageRatio: "4/3",
    cropMode: "cover",
    borderRadius: "md",
    showTitle: true,
    showCaptions: true,
    lightbox: true,
    futureSetting: "preserve",
  },
  items: [
    {
      id: "img1",
      imageUrl: "https://example.test/a.webp",
      title: "Image one",
      alt: "Alt one",
      tags: [],
      futureItem: "preserve",
    },
    {
      id: "img2",
      imageUrl: "https://example.test/b.webp",
      title: "Image two",
      alt: "Alt two",
      tags: [],
    },
  ],
};
let root: Root, container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  history.replaceState({}, "", "/marketing/content/galleries");
  api.listMarketingGalleries.mockResolvedValue([gallery]);
  api.getMarketingGallery.mockResolvedValue(structuredClone(gallery));
  api.updateMarketingGallery.mockImplementation(async (_id, payload) => ({
    ...gallery,
    ...payload,
  }));
  vi.spyOn(window, "confirm").mockReturnValue(true);
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});
async function render(media = false) {
  await act(async () => root.render(<GalleryManager canUseMedia={media} />));
}
async function edit(media = false) {
  await render(media);
  await act(async () => {
    (
      container.querySelector(
        '[aria-label="Edit Synthetic Gallery"]',
      ) as HTMLButtonElement
    ).click();
  });
}
function button(text: string) {
  return Array.from(container.querySelectorAll("button")).find(
    (b) => b.textContent?.trim() === text,
  )!;
}
it("restores original gallery table and explicitly named actions", async () => {
  await render();
  expect(
    Array.from(container.querySelectorAll("th")).map((n) => n.textContent),
  ).toEqual(["Title", "Slug", "Images", "Status", "Updated", "Actions"]);
  for (const name of ["Edit", "Publish", "Duplicate", "Delete"])
    expect(
      container.querySelector(`[aria-label="${name} Synthetic Gallery"]`),
    ).not.toBeNull();
});
it("shows original full editor settings and withholds media actions without permission", async () => {
  await edit();
  for (const text of [
    "Gallery Details",
    "Images",
    "Display Settings",
    "Preview Gallery",
    "Caption position",
    "Lightbox",
  ])
    expect(container.textContent).toContain(text);
  expect(button("Add Images").disabled).toBe(true);
  expect(container.querySelector('input[type="file"]')).toBeNull();
  expect(container.textContent).not.toContain("Choose or upload image");
});
it("retains unknown fields through shared controls and native saves", async () => {
  await edit();
  const title = container.querySelector("#gallery-title") as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(title, "Updated gallery");
    title.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => button("Save Gallery").click());
  expect(api.updateMarketingGallery).toHaveBeenCalledWith(
    "gallery-one",
    expect.objectContaining({
      title: "Updated gallery",
      settings: expect.objectContaining({ futureSetting: "preserve" }),
      items: expect.arrayContaining([
        expect.objectContaining({ futureItem: "preserve" }),
      ]),
    }),
  );
});
it("preserves the local draft after a failed save", async () => {
  api.updateMarketingGallery.mockRejectedValue(Error("Save failed"));
  await edit();
  const title = container.querySelector("#gallery-title") as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(title, "Retained draft");
    title.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => button("Save Gallery").click());
  expect(title.value).toBe("Retained draft");
  expect(container.textContent).toContain("Save failed");
});
it("opens the original content preview dialog using the shared gallery renderer", async () => {
  await edit();
  await act(async () => button("Preview Gallery").click());
  expect(container.querySelector("dialog[open]")?.textContent).toContain(
    "Content Preview",
  );
  expect(container.querySelector("dialog[open] img")).not.toBeNull();
  await act(async () => {
    (
      container.querySelector(
        '[aria-label="Close gallery preview"]',
      ) as HTMLButtonElement
    ).click();
  });
  expect(container.querySelector("dialog[open]")).toBeNull();
});
it("preserves reorder and confirms removal before changing the draft", async () => {
  await edit();
  await act(async () => {
    (
      container.querySelector(
        '[aria-label="Move image 1 down"]',
      ) as HTMLButtonElement
    ).click();
  });
  await act(async () => button("Save Gallery").click());
  expect(
    api.updateMarketingGallery.mock.calls[0][1].items.map((x: any) => x.id),
  ).toEqual(["img2", "img1"]);
  vi.mocked(window.confirm).mockReturnValue(false);
  await act(async () => {
    (
      container.querySelector(
        '[aria-label="Remove image 1"]',
      ) as HTMLButtonElement
    ).click();
  });
  expect(
    container.querySelectorAll('[aria-label^="Remove image"]'),
  ).toHaveLength(2);
});
it("exposes authorized uploads and rejects empty image URLs before sending a mutation", async () => {
  await edit(true);
  expect(container.querySelector('input[type="file"]')).not.toBeNull();
  await act(async () => button("Add image URL").click());
  await act(async () => button("Save Gallery").click());
  expect(api.updateMarketingGallery).not.toHaveBeenCalled();
  expect(container.textContent).toContain(
    "Add an image URL or remove the empty image",
  );
});

async function drop(files: File[]) {
  const zone = container.querySelector('[data-testid="cms-image-dropzone"]')!;
  const event = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: { files } });
  await act(async () => {
    zone.dispatchEvent(event);
  });
}
it("uploads dropped images through the existing native transport", async () => {
  await edit(true);
  api.uploadMarketingMedia.mockResolvedValue({
    id: "uploaded",
    url: "https://example.test/new.webp",
  });
  const file = new File(["image"], "new.webp", { type: "image/webp" });
  await drop([file]);
  expect(api.uploadMarketingMedia).toHaveBeenCalledWith(
    { file },
    { signal: expect.any(AbortSignal) },
  );
  await act(async () => button("Save Gallery").click());
  expect(api.updateMarketingGallery.mock.calls[0][1].items).toHaveLength(3);
});
it("rejects non-image drops without calling the upload API", async () => {
  await edit(true);
  await drop([new File(["document"], "bad.pdf", { type: "application/pdf" })]);
  expect(api.uploadMarketingMedia).not.toHaveBeenCalled();
  expect(container.textContent).toContain("choose PNG, JPEG, WebP or GIF");
});
it("does not expose upload drop targets or send uploads without media permission", async () => {
  await edit(false);
  expect(
    container.querySelector('[data-testid="cms-image-dropzone"]'),
  ).toBeNull();
  expect(container.querySelector('input[type="file"]')).toBeNull();
  expect(api.uploadMarketingMedia).not.toHaveBeenCalled();
});
it.each(["https://example.test/leave", "javascript:alert(1)"])(
  "keeps draft preview CTA inert for %s",
  async (linkUrl) => {
    api.getMarketingGallery.mockResolvedValue({
      ...structuredClone(gallery),
      settings: { ...gallery.settings, captionPosition: "below" },
      items: [{ ...gallery.items[0], linkUrl, ctaText: "Draft action" }],
    });
    await edit();
    await act(async () => button("Preview Gallery").click());
    const dialog = container.querySelector("dialog[open]")!;
    const action = dialog.querySelector("[data-gallery-inert-action]")!;
    expect(action.textContent).toBe("Draft action");
    expect(dialog.querySelector("a[href]")).toBeNull();
    expect(dialog.innerHTML).not.toContain(linkUrl);
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });
    await act(async () => {
      action.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(location.pathname).toBe("/marketing/content/galleries");
  },
);

it("preserves public renderer CTA navigation by default", async () => {
  const fixture = {
    ...gallery,
    settings: { ...gallery.settings, captionPosition: "below" },
    items: [
      {
        ...gallery.items[0],
        linkUrl: "https://example.test/public",
        ctaText: "Public action",
      },
    ],
  };
  await act(async () =>
    root.render(<GalleryPresentation gallery={fixture as any} />),
  );
  expect(container.querySelector("a")?.getAttribute("href")).toBe(
    "https://example.test/public",
  );
  expect(container.querySelector("[data-gallery-inert-action]")).toBeNull();
});
it("keeps browse and library as separate upload focus targets", async () => {
  await edit(true);
  const zone = container.querySelector('[data-testid="cms-image-dropzone"]')!;
  expect(zone.getAttribute("role")).not.toBe("button");
  expect(zone.querySelectorAll("button")).toHaveLength(2);
  expect(
    zone.querySelector('button button, [role="button"] button'),
  ).toBeNull();
});
it("opens a modal lightbox, traps tab navigation, and restores trigger focus on Escape", async () => {
  await edit();
  await act(async () => button("Preview Gallery").click());
  const preview = container.querySelector("dialog[open]")!;
  const trigger = preview.querySelector("img")!.closest("button")!;
  trigger.focus();
  await act(async () => trigger.click());
  const modal = container.querySelector(
    'dialog[aria-label="Gallery image preview"]',
  ) as HTMLDialogElement;
  expect(modal.open).toBe(true);
  expect(modal.getAttribute("aria-modal")).toBe("true");
  const controls = Array.from(modal.querySelectorAll("button"));
  expect(document.activeElement).toBe(controls[0]);
  controls[controls.length - 1].focus();
  const tab = new KeyboardEvent("keydown", {
    key: "Tab",
    bubbles: true,
    cancelable: true,
  });
  await act(async () => {
    controls[controls.length - 1].dispatchEvent(tab);
  });
  expect(tab.defaultPrevented).toBe(true);
  expect(document.activeElement).toBe(controls[0]);
  const reverse = new KeyboardEvent("keydown", {
    key: "Tab",
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  });
  await act(async () => {
    controls[0].dispatchEvent(reverse);
  });
  expect(reverse.defaultPrevented).toBe(true);
  expect(document.activeElement).toBe(controls[controls.length - 1]);
  await act(async () => {
    controls[0].dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
      }),
    );
  });
  expect(
    container.querySelector('dialog[aria-label="Gallery image preview"]'),
  ).toBeNull();
  expect(document.activeElement).toBe(trigger);
  expect(preview.hasAttribute("open")).toBe(true);
});
