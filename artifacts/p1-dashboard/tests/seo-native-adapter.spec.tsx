import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import SeoManager from "../src/marketing/SeoManager";
const api = vi.hoisted(() =>
  Object.fromEntries(
    [
      "getMarketingSeo",
      "saveMarketingSeo",
      "getMarketingRobots",
      "saveMarketingRobots",
      "getMarketingSeoAudit",
      "listMarketingRedirects",
      "createMarketingRedirect",
      "updateMarketingRedirect",
      "deleteMarketingRedirect",
    ].map((k) => [k, vi.fn()]),
  ),
);
vi.mock("@workspace/api-client-react/dashboard", () => api);
vi.mock("../src/marketing/MediaLibrary", () => ({ MediaLibrary: () => null }));
vi.mock("../src/marketing/useCmsUnsavedChanges", () => ({
  useCmsUnsavedChanges: vi.fn(),
}));
let root: Root, container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(globalThis, { React, IS_REACT_ACT_ENVIRONMENT: true });
  api.getMarketingSeo.mockResolvedValue({ siteName: "Synthetic P1" });
  api.listMarketingRedirects.mockResolvedValue([]);
  api.getMarketingSeoAudit.mockResolvedValue({
    pages: [
      {
        id: "p1",
        title: "Page One",
        slug: "page-one",
        status: "published",
        issues: ["missing_seo_title", "missing_og_image"],
      },
    ],
    posts: [
      {
        id: "b1",
        title: "Post One",
        slug: "post-one",
        isPublished: true,
        issues: ["missing_author"],
      },
    ],
    events: [{ id: "e1", title: "Event One", issues: ["missing_description"] }],
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});
async function render(
  canEditContent?: (kind: "pages" | "blog" | "events") => boolean,
) {
  await act(async () =>
    root.render(
      <SeoManager canUseMedia={false} canEditContent={canEditContent} />,
    ),
  );
}
async function tab(name: string) {
  await act(async () => {
    Array.from(container.querySelectorAll("nav button"))
      .find((x) => x.textContent === name)!
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
}
it("restores original settings groups and colored tabs without adding a roadmap", async () => {
  await render();
  for (const title of [
    "Site Identity",
    "Default SEO Meta",
    "Default Open Graph Image",
    "Organization Logo",
    "Social Profiles",
  ])
    expect(container.textContent).toContain(title);
  expect(container.querySelectorAll("nav svg")).toHaveLength(4);
  expect(container.textContent).not.toContain("Roadmap");
});
it("shows original issue summaries/reference with correctly scoped editor destinations", async () => {
  await render(() => true);
  await tab("SEO Audit");
  expect(container.textContent).toContain("4 signals detected");
  expect(container.textContent).toContain("Issue Reference");
  expect(
    container
      .querySelector('[data-testid="audit-edit-p1"]')
      ?.getAttribute("href"),
  ).toBe("/marketing/content/pages?page=p1");
  expect(
    container
      .querySelector('[data-testid="audit-edit-b1"]')
      ?.getAttribute("href"),
  ).toBe("/marketing/content/blog?post=b1");
  expect(
    container.querySelector('[data-testid="audit-edit-e1"]')?.textContent,
  ).toBe("Open Events");
});
it("does not expose editing links when separate content permissions are absent", async () => {
  await render();
  await tab("SEO Audit");
  expect(
    container.querySelectorAll('[data-testid^="audit-edit-"]'),
  ).toHaveLength(0);
  expect(container.textContent).toContain("Page One");
});
it("shows an explicit audit failure instead of a fabricated empty success", async () => {
  api.getMarketingSeoAudit.mockRejectedValue(Error("Analytics unavailable"));
  await render();
  await tab("SEO Audit");
  expect(container.textContent).toContain("Failed to load audit data");
  expect(container.textContent).not.toContain("No SEO issues found");
});
it("preserves the internal-path redirect restrictions and search/editor workflow", async () => {
  api.listMarketingRedirects.mockResolvedValue([
    {
      id: "r1",
      fromPath: "/old",
      toPath: "/new",
      statusCode: 301,
      isActive: false,
      note: "Synthetic",
    },
  ]);
  await render();
  await tab("Redirects");
  expect(container.textContent).toContain(
    "External destinations, reserved routes and cycles are not supported",
  );
  expect(container.textContent).toContain("Inactive");
  expect(
    container.querySelector('[data-testid="redirect-row-r1"]'),
  ).not.toBeNull();
});
it("retains edited defaults after a failed save", async () => {
  api.saveMarketingSeo.mockRejectedValue(Error("Save unavailable"));
  await render();
  const input = Array.from(container.querySelectorAll("input")).find(
    (node) => node.value === "Synthetic P1",
  )!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, "Edited P1");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () =>
    container
      .querySelector("form")!
      .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })),
  );
  expect(api.saveMarketingSeo).toHaveBeenCalledWith(
    expect.objectContaining({ siteName: "Edited P1" }),
  );
  expect(input.value).toBe("Edited P1");
  expect(container.textContent).toContain("Save unavailable");
});

it("does not invent public preview URLs for retained CMS slugs", async () => {
  await render(() => true);
  await tab("SEO Audit");
  expect(container.querySelectorAll('[data-testid^="audit-preview-"]')).toHaveLength(0);
  expect(container.querySelector('[data-testid="audit-edit-p1"]')).not.toBeNull();
});
