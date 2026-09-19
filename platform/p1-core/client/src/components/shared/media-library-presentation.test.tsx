// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import MediaLibrary from "../../../../../../artifacts/p1-dashboard/src/marketing/MediaLibrary";
import { getCroppedFile } from "./image-cropper-editor";
vi.mock(
  "../../../../../../artifacts/p1-dashboard/node_modules/react",
  async () => await import("react"),
);
vi.mock(
  "../../../../../../artifacts/p1-dashboard/node_modules/react/jsx-runtime",
  async () => await import("react/jsx-runtime"),
);
vi.mock(
  "../../../../../../artifacts/p1-dashboard/node_modules/react/jsx-dev-runtime",
  async () => await import("react/jsx-dev-runtime"),
);
vi.mock(
  "../../../../../../artifacts/p1-dashboard/node_modules/lucide-react",
  async () => await import("lucide-react"),
);
const api = vi.hoisted(() => ({
  list: vi.fn(),
  save: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  replace: vi.fn(),
  source: vi.fn(),
}));
vi.mock("../../../../../../lib/api-client-react/src/dashboard/index", () => ({
  listMarketingMedia: api.list,
  updateMarketingMedia: api.save,
  uploadMarketingMedia: api.upload,
  deleteMarketingMedia: api.remove,
  replaceMarketingMedia: api.replace,
  getMarketingMediaSource: api.source,
  getGetMarketingMediaSourceUrl: (id: string) => `/authenticated/media/${id}/source`,
}));
const asset = {
  id: "image",
  originalName: "field.png",
  title: "Field photo",
  url: "/uploads/field.png",
  mimeType: "image/png",
  fileSize: 1024,
  assetKind: "image",
  alt: "Field",
  usageCount: 2,
  liveUsageCount: 1,
  isInUse: true,
  usageRefs: [
    {
      entityType: "page",
      entityId: "home",
      entityName: "Home page",
      field: "content",
      statusLabel: "Published",
      isLive: true,
      path: "/home",
    },
  ],
};
let host: HTMLDivElement;
let root: Root;
const button = (name: string) =>
  Array.from(host.querySelectorAll<HTMLButtonElement>("button")).find(
    (b) => b.textContent === name,
  )!;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  vi.clearAllMocks();
  api.list.mockResolvedValue([asset]);
  api.save.mockImplementation(async (_, data) => ({ ...asset, ...data }));
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});
async function mount(props = {}) {
  await act(async () => root.render(<MediaLibrary {...props} />));
}
async function open() {
  await act(async () => host.querySelector<HTMLButtonElement>(".media-asset-tile")!.click());
}
it("shares square gallery and all metadata groups, live references and authenticated previews", async () => {
  await mount();
  expect(host.querySelector(".media-asset-tile img")?.getAttribute("src")).toBe(
    "/authenticated/media/image/source",
  );
  await open();
  expect(host.querySelectorAll(".media-metadata-field")).toHaveLength(9);
  expect(host.querySelectorAll(".media-seo-panel .media-metadata-field")).toHaveLength(4);
  expect(host.querySelector(".media-usage-reference")?.textContent).toContain("/home");
  expect(host.querySelector(".media-reference-status.is-live")?.textContent).toBe("Published");
  expect(host.querySelector("a[download]")?.getAttribute("href")).toBe(
    "/authenticated/media/image/source",
  );
});
it("preserves dirty close protection and saves metadata before crop can open", async () => {
  await mount();
  await open();
  const input = host.querySelector<HTMLInputElement>("#media-alt")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
      input,
      "New field",
    );
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  expect(button("Crop Image").disabled).toBe(true);
  vi.spyOn(window, "confirm").mockReturnValue(false);
  await act(async () =>
    host.querySelector<HTMLButtonElement>('[aria-label="Back to media"]')!.click(),
  );
  expect(host.querySelector(".media-details-modal")).not.toBeNull();
  await act(async () =>
    host
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(api.save).toHaveBeenCalledWith(
    "image",
    expect.objectContaining({ alt: "New field" }),
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(button("Crop Image").disabled).toBe(false);
});
it("keeps single selection immediate and refuses incompatible picker assets", async () => {
  const select = vi.fn();
  await mount({ onSelect: select, acceptAsset: () => false });
  expect(host.querySelector<HTMLButtonElement>(".media-asset-tile")!.disabled).toBe(true);
  await mount({ onSelect: select, acceptAsset: () => true });
  await open();
  expect(select).toHaveBeenCalledWith(asset);
  expect(host.querySelector(".media-details-modal")).toBeNull();
});
it("requires destructive confirmation before deletion", async () => {
  await mount();
  await open();
  vi.spyOn(window, "confirm").mockReturnValue(false);
  await act(async () => button("Delete").click());
  expect(api.remove).not.toHaveBeenCalled();
});
it("encodes crop using natural dimensions and matching filename codec", async () => {
  const draw = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: draw } as any);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (callback, type) {
    callback(new Blob(["pixels"], { type }));
  });
  const img = {
    width: 100,
    height: 50,
    naturalWidth: 1000,
    naturalHeight: 500,
  } as HTMLImageElement;
  const file = await getCroppedFile(
    img,
    { unit: "px", x: 10, y: 5, width: 50, height: 25 },
    "field.png",
    "image/webp",
  );
  expect(file.name).toBe("field.webp");
  expect(file.type).toBe("image/webp");
  expect(draw).toHaveBeenCalledWith(img, 100, 50, 500, 250, 0, 0, 500, 250);
});
it("rejects unsupported codec fallback and invalid crop bounds", async () => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
  } as any);
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) =>
    callback(new Blob(["pixels"], { type: "image/png" })),
  );
  const img = {
    width: 100,
    height: 50,
    naturalWidth: 1000,
    naturalHeight: 500,
  } as HTMLImageElement;
  await expect(
    getCroppedFile(
      img,
      { unit: "px", x: 0, y: 0, width: 50, height: 25 },
      "field.png",
      "image/webp",
    ),
  ).rejects.toThrow("encode");
  await expect(
    getCroppedFile(
      img,
      { unit: "px", x: 90, y: 0, width: 50, height: 25 },
      "field.png",
      "image/webp",
    ),
  ).rejects.toThrow("within");
});

it("filters documents and usage without losing the original media list", async () => {
  api.list.mockResolvedValue([
    asset,
    {
      ...asset,
      id: "document",
      originalName: "scope.pdf",
      assetKind: "document",
      mimeType: "application/pdf",
      isInUse: false,
      usageCount: 0,
      liveUsageCount: 0,
    },
  ]);
  await mount();
  const type = host.querySelector<HTMLSelectElement>('select[aria-label="Type"]')!;
  await act(async () => {
    type.value = "documents";
    type.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(host.querySelectorAll(".media-asset-tile")).toHaveLength(1);
  expect(host.querySelector(".media-asset-tile")?.getAttribute("aria-label")).toBe("scope.pdf");
  const usage = host.querySelector<HTMLSelectElement>('select[aria-label="Usage"]')!;
  await act(async () => {
    usage.value = "live";
    usage.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(host.textContent).toContain("No media matches your filters");
  expect(host.querySelector(".media-library-summary")?.textContent).toContain("2 media items");
});

it("retains completed uploads when a later file exceeds the limit", async () => {
  await mount();
  await act(async () => button("Upload File").click());
  const input = host.querySelector<HTMLInputElement>('input[type="file"]')!;
  const valid = new File(["image"], "small.png", { type: "image/png" });
  const large = new File(["image"], "large.png", { type: "image/png" });
  Object.defineProperty(large, "size", { value: 11 * 1024 * 1024 });
  Object.defineProperty(input, "files", { value: [valid, large], configurable: true });
  await act(async () => input.dispatchEvent(new Event("change", { bubbles: true })));
  expect(api.upload).toHaveBeenCalledTimes(1);
  expect(api.upload).toHaveBeenCalledWith(
    { file: valid },
    expect.objectContaining({ signal: expect.any(AbortSignal) }),
  );
  expect(host.querySelector(".media-upload-modal [role=alert]")?.textContent).toContain(
    "Earlier successful uploads are retained",
  );
  expect(api.list).toHaveBeenCalledTimes(2);
});
