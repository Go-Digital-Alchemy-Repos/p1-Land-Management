import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import WebsiteEditor from "../src/marketing/WebsiteEditor";
const state = vi.hoisted(() => ({
  server: {} as any,
  api: Object.fromEntries(
    [
      "listWebsiteContent",
      "getWebsiteContent",
      "getWebsiteContentRevisions",
      "saveWebsiteContentDraft",
      "publishWebsiteContent",
      "restoreWebsiteContentRevision",
    ].map((key) => [key, vi.fn()]),
  ),
}));
vi.mock("@workspace/api-client-react/dashboard", () => state.api);
vi.mock("../src/marketing/MediaLibrary", () => ({
  MediaLibrary: () => <div>Media library adapter</div>,
}));
vi.mock("../src/marketing/useCmsUnsavedChanges", () => ({
  useCmsUnsavedChanges: vi.fn(),
}));
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  state.server = {
    stackId: "p1-land-management",
    route: { id: "home", path: "/" },
    component: {
      key: "home-content",
      fields: [
        {
          path: "title",
          label: "Page title",
          type: "text",
          required: true,
          maxLength: 100,
        },
        { path: "image", label: "Hero image", type: "image" },
      ],
    },
    previewUrl: "https://www.p1landmanagement.com/?cmsPreview=1",
    draftContent: {
      title: "Original",
      image: "/image.jpg",
      unknown: { retained: true },
    },
    draftRevision: 1,
    publishedRevision: 1,
    publishedAt: null,
  };
  state.api.listWebsiteContent.mockResolvedValue([
    {
      routeId: "home",
      componentKey: "home-content",
      path: "/",
      label: "Home content",
    },
  ]);
  state.api.getWebsiteContent.mockImplementation(async () =>
    structuredClone(state.server),
  );
  state.api.getWebsiteContentRevisions.mockResolvedValue([
    { id: "r1", revision: 1, kind: "draft" },
  ]);
  state.api.saveWebsiteContentDraft.mockImplementation(
    async (_route, _component, input) => {
      state.server = {
        ...state.server,
        draftContent: structuredClone(input.content),
        draftRevision: state.server.draftRevision + 1,
      };
      return structuredClone(state.server);
    },
  );
  state.api.publishWebsiteContent.mockImplementation(async () => {
    state.server = {
      ...state.server,
      publishedRevision: state.server.draftRevision,
    };
    return structuredClone(state.server);
  });
  state.api.restoreWebsiteContentRevision.mockImplementation(async () => {
    state.server = {
      ...state.server,
      draftContent: { title: "Restored", image: "/image.jpg" },
      draftRevision: state.server.draftRevision + 1,
    };
    return structuredClone(state.server);
  });
  history.replaceState({}, "", "/?routeId=home&componentKey=home-content");
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});
async function render(canUseMedia = false) {
  await act(async () =>
    root.render(<WebsiteEditor canUseMedia={canUseMedia} />),
  );
}
function button(name: string) {
  return Array.from(host.querySelectorAll("button")).find(
    (node) => (node.getAttribute("aria-label") || node.textContent) === name,
  )!;
}
async function click(name: string) {
  await act(async () => button(name).click());
}
async function type(value: string) {
  await act(async () => {
    const node = host.querySelector("#website-field-title")!;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(node, value);
    node.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
it("keeps original cards and schema fields, denies absent media grant, and retains draft on conflict", async () => {
  await render();
  expect(host.textContent).toContain("Editable content");
  expect(host.textContent).toContain("Revision history");
  expect(host.textContent).toContain("Live preview");
  expect(button("Choose image for Hero image")).toBeUndefined();
  await type("My local draft");
  expect(button("Publish").disabled).toBe(true);
  state.api.saveWebsiteContentDraft.mockRejectedValueOnce(
    new Error("Revision conflict"),
  );
  await click("Save draft");
  expect(
    (host.querySelector("#website-field-title") as HTMLInputElement).value,
  ).toBe("My local draft");
  expect(host.textContent).toContain("Revision conflict");
  expect(state.api.saveWebsiteContentDraft).toHaveBeenCalledWith(
    "home",
    "home-content",
    {
      expectedRevision: 1,
      content: {
        title: "My local draft",
        image: "/image.jpg",
        unknown: { retained: true },
      },
    },
    expect.anything(),
  );
  expect(state.api.saveWebsiteContentDraft).toHaveBeenCalledTimes(1);
});
it("publishes only saved revisions and restores as a new draft", async () => {
  await render(true);
  expect(button("Choose image for Hero image")).toBeDefined();
  await type("Saved draft");
  await click("Save draft");
  expect(host.textContent).toContain("Draft r2");
  await click("Publish");
  expect(state.api.publishWebsiteContent).toHaveBeenCalledWith(
    "home",
    "home-content",
    { expectedRevision: 2 },
    expect.anything(),
  );
  await click("Restore r1");
  expect(state.api.restoreWebsiteContentRevision).toHaveBeenCalledWith(
    "home",
    "home-content",
    1,
    { expectedRevision: 2 },
    expect.anything(),
  );
  expect(host.textContent).toContain("Draft r3");
  expect(host.textContent).toContain("Published r2");
  expect(state.api.publishWebsiteContent).toHaveBeenCalledTimes(1);
});
it("preview handshake rejects foreign origins and sends only to the configured renderer", async () => {
  await render();
  const frame = host.querySelector("iframe")!;
  const send = vi.spyOn(frame.contentWindow!, "postMessage");
  send.mockClear();
  const data = {
    type: "core-platform:client-site-preview-ready",
    protocolVersion: "1.0",
    clientStackId: "p1-land-management",
    routeId: "home",
    componentKey: "home-content",
  };
  window.dispatchEvent(
    new MessageEvent("message", {
      source: frame.contentWindow,
      origin: "https://foreign.example",
      data,
    }),
  );
  expect(send).not.toHaveBeenCalled();
  window.dispatchEvent(
    new MessageEvent("message", {
      source: frame.contentWindow,
      origin: "https://www.p1landmanagement.com",
      data,
    }),
  );
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      revision: 1,
      content: expect.objectContaining({ title: "Original" }),
    }),
    "https://www.p1landmanagement.com",
  );
  expect(frame.getAttribute("sandbox")).toBe("allow-same-origin allow-scripts");
});

it("provides one heading for content selection and selected-editor loading", async () => {
  history.replaceState({}, "", "/");
  await render();
  expect(
    Array.from(host.querySelectorAll("h1")).map((node) => node.textContent),
  ).toEqual(["Website Content"]);
  state.api.getWebsiteContent.mockImplementation(() => new Promise(() => {}));
  await click("Home content/");
  expect(
    Array.from(host.querySelectorAll("h1")).map((node) => node.textContent),
  ).toEqual(["Website Content"]);
  expect(host.textContent).toContain("Loading website editor…");
});
