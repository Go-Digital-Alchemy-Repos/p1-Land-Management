import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
const api = vi.hoisted(() => ({ page: vi.fn(), gallery: vi.fn(), section: vi.fn(), list: vi.fn(), builder: vi.fn(), create: vi.fn(), verify: vi.fn() }));
vi.mock("@workspace/api-client-react/dashboard", () => ({
  listMarketingPages: api.list, getMarketingPage: api.page, getMarketingPageBuilder: api.builder, createMarketingPage: api.create,
  listMarketingGalleries: api.list, getMarketingGallery: api.gallery, createMarketingGallery: api.create,
  listMarketingSections: api.list, getMarketingSection: api.section, getMarketingSectionBuilder: api.builder, createMarketingSection: api.create,
}));
vi.mock("../../../../artifacts/p1-dashboard/src/marketing/usePageReservation", () => ({ usePageReservation: () => ({ owned: true, verify: api.verify }) }));
vi.mock("../../../../artifacts/p1-dashboard/src/marketing/useSectionReservation", () => ({ useSectionReservation: () => ({ owned: true, verify: api.verify }) }));
vi.mock("../../../../artifacts/p1-dashboard/src/marketing/CmsBlockEditor", () => ({ CmsBlockEditor: () => null }));
vi.mock("../../../../artifacts/p1-dashboard/src/marketing/BuilderPreview", () => ({ BuilderPreview: () => null }));
vi.mock("../../../../artifacts/p1-dashboard/src/marketing/GalleryPreview", () => ({ GalleryPreview: () => null }));
import PageManager, { readPageIntent } from "../../../../artifacts/p1-dashboard/src/marketing/PageManager";
import GalleryManager, { readGalleryIntent } from "../../../../artifacts/p1-dashboard/src/marketing/GalleryManager";
import SectionManager, { readSectionIntent } from "../../../../artifacts/p1-dashboard/src/marketing/SectionManager";
const row = { id: "retained-record", title: "Existing title", name: "Existing section", slug: "existing", status: "draft", pageType: "custom", template: "full-width", content: { blocks: [] }, settings: {}, items: [], blocks: [] };
const cases = [
  { key: "page", parse: readPageIntent, component: () => <PageManager canUseMedia={false} canUseSections={false} canUseMenus={false} />, get: api.page },
  { key: "gallery", parse: readGalleryIntent, component: () => <GalleryManager canUseMedia={false} />, get: api.gallery },
  { key: "section", parse: readSectionIntent, component: () => <SectionManager canUseMedia={false} />, get: api.section },
];
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.clearAllMocks(); api.list.mockResolvedValue([]); api.builder.mockResolvedValue({ blocks: [], categories: [], templates: [], previewUrl: "/preview" });
  for (const get of [api.page, api.gallery, api.section]) get.mockResolvedValue(row);
  api.create.mockResolvedValue(row); api.verify.mockResolvedValue(undefined); vi.spyOn(window, "confirm").mockReturnValue(true);
  HTMLDialogElement.prototype.close = vi.fn(); (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  history.replaceState(null, "", "/marketing/content/pages"); host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });
const backButton = () => [...host.querySelectorAll("button")].find(button => button.textContent?.startsWith("Back to"))!;
for (const entry of cases) describe(entry.key, () => {
  it("selects a retained opaque ID directly without fetching the list", async () => {
    history.replaceState(null, "", `?${entry.key}=retained-record`); await act(async () => root.render(entry.component()));
    expect(entry.get).toHaveBeenCalledWith("retained-record", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(api.list).not.toHaveBeenCalled(); expect(host.textContent).toContain(entry.key === "section" ? "Existing section" : "Existing title");
  });
  it("rejects duplicate, blank, traversal and overlong selectors before requesting records", async () => {
    for (const value of ["", "../private", "a/b", "a%2Fb", "x".repeat(201)]) expect(entry.parse(`?${entry.key}=${value}`).error).not.toBe("");
    expect(entry.parse(`?${entry.key}=one&${entry.key}=two`).error).not.toBe("");
    history.replaceState(null, "", `?${entry.key}=%2Fprivate`); await act(async () => root.render(entry.component()));
    expect(entry.get).not.toHaveBeenCalled(); expect(api.list).toHaveBeenCalled(); expect(host.querySelector('[role="alert"]')?.textContent).toContain("Invalid");
  });
  it("shows record failure and provides a list escape without creating content", async () => {
    entry.get.mockRejectedValueOnce(Error("Record not found")); history.replaceState(null, "", `?${entry.key}=missing&other=retained#context`);
    await act(async () => root.render(entry.component())); expect(host.textContent).toContain("Record not found");
    await act(async () => backButton().click()); expect(new URLSearchParams(location.search).has(entry.key)).toBe(false);
    expect(location.search).toBe("?other=retained"); expect(location.hash).toBe("#context"); expect(api.create).not.toHaveBeenCalled();
  });
  it("opens an unsaved create intent and preserves draft/query on cancelled close/navigation", async () => {
    history.replaceState({ preserved: true }, "", `?${entry.key}=new&other=retained#context`); await act(async () => root.render(entry.component()));
    expect(entry.get).not.toHaveBeenCalled(); expect(api.create).not.toHaveBeenCalled();
    const input = [...host.querySelectorAll("input")].find(input => input.type === "text" || !input.type)!;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "Unsaved content"); input.dispatchEvent(new Event("input", { bubbles: true })); });
    vi.mocked(window.confirm).mockReturnValue(false); await act(async () => backButton().click());
    expect(input.value).toBe("Unsaved content"); expect(location.search).toContain(`${entry.key}=new`);
    history.replaceState(null, "", "?unrelated=changed"); const event = new Event("p1:before-navigation", { cancelable: true });
    await act(async () => { window.dispatchEvent(event); }); expect(event.defaultPrevented).toBe(true); expect(location.search).toContain(`${entry.key}=new`);
    vi.mocked(window.confirm).mockReturnValue(true); await act(async () => backButton().click()); expect(location.search).toBe("?other=retained");
  });
  it("replaces create intent with returned ID only after explicit save", async () => {
    history.replaceState({ preserved: true }, "", `?${entry.key}=new&other=retained#context`); await act(async () => root.render(entry.component()));
    await act(async () => { host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(api.create).toHaveBeenCalledTimes(1); expect(new URLSearchParams(location.search).get(entry.key)).toBe("retained-record");
    expect(location.search).toContain("other=retained"); expect(location.hash).toBe("#context"); expect(history.state).toEqual({ preserved: true });
  });
});
