import { describe, expect, it, vi } from "vitest";
import type { CmsPage, MenuItem } from "@shared/schema";

vi.mock("../storage", () => ({
  storage: {
    cmsMenus: {
      getAll: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import {
  getCmsPageMenuReferences,
  removeMenuItemsForPage,
  syncMenuItemsWithPage,
} from "../services/cms-relationships.service";
import { storage } from "../storage";

function page(overrides: Partial<CmsPage>): CmsPage {
  return {
    id: "page-1",
    title: "About",
    slug: "about",
    status: "published",
    pageType: "custom",
    template: "full-width",
    sidebarId: null,
    content: {},
    seoTitle: null,
    seoDescription: null,
    seoKeywords: null,
    ogImageUrl: null,
    canonicalUrl: null,
    noindex: false,
    createdBy: null,
    updatedBy: null,
    scheduledAt: null,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function item(overrides: Partial<MenuItem>): MenuItem {
  return {
    id: "item-1",
    label: "About",
    url: "/about",
    openInNewTab: false,
    children: [],
    ...overrides,
  };
}

describe("cms relationship sync", () => {
  it("updates linked page-sourced menu labels", () => {
    const result = syncMenuItemsWithPage(
      [item({ pageId: "page-1", labelSource: "page" })],
      page({ title: "About", slug: "about" }),
      page({ title: "About Us", slug: "about" }),
    );

    expect(result.changed).toBe(true);
    expect(result.items[0]).toMatchObject({
      label: "About Us",
      url: "/about",
      pageId: "page-1",
      labelSource: "page",
    });
  });

  it("preserves custom labels on linked menu items", () => {
    const result = syncMenuItemsWithPage(
      [item({ label: "Our Story", pageId: "page-1", labelSource: "custom" })],
      page({ title: "About", slug: "about" }),
      page({ title: "About Us", slug: "about" }),
    );

    expect(result.items[0]).toMatchObject({
      label: "Our Story",
      pageId: "page-1",
      labelSource: "custom",
    });
  });

  it("backfills legacy URL-only items and updates matching labels", () => {
    const result = syncMenuItemsWithPage(
      [item({ label: "About", pageId: undefined, labelSource: undefined })],
      page({ title: "About", slug: "about" }),
      page({ title: "About Us", slug: "about-us" }),
    );

    expect(result.items[0]).toMatchObject({
      label: "About Us",
      url: "/about-us",
      pageId: "page-1",
      labelSource: "page",
    });
  });

  it("updates linked menu URLs when the page slug changes", () => {
    const result = syncMenuItemsWithPage(
      [item({ pageId: "page-1", labelSource: "page" })],
      page({ title: "About", slug: "about" }),
      page({ title: "About", slug: "about-us" }),
    );

    expect(result.items[0]?.url).toBe("/about-us");
  });

  it("does not treat absolute external URLs as legacy page references", () => {
    const result = syncMenuItemsWithPage(
      [item({ label: "External About", url: "https://example.com/about", pageId: undefined })],
      page({ title: "About", slug: "about" }),
      page({ title: "About Us", slug: "about-us" }),
    );

    expect(result.changed).toBe(false);
    expect(result.items[0]).toMatchObject({
      label: "External About",
      url: "https://example.com/about",
      pageId: undefined,
    });
  });

  it("updates nested children recursively", () => {
    const result = syncMenuItemsWithPage(
      [
        item({
          id: "parent",
          label: "Resources",
          url: "#",
          children: [item({ id: "child", pageId: "page-1", labelSource: "page" })],
        }),
      ],
      page({ title: "About", slug: "about" }),
      page({ title: "About Us", slug: "about-us" }),
    );

    expect(result.items[0]?.children[0]).toMatchObject({
      label: "About Us",
      url: "/about-us",
      pageId: "page-1",
      labelSource: "page",
    });
  });

  it("finds linked and legacy menu references for a page", async () => {
    vi.mocked(storage.cmsMenus.getAll).mockResolvedValue([
      {
        id: "menu-main",
        name: "Main Navigation",
        location: "main_navigation",
        items: [
          item({ id: "linked", pageId: "page-1", labelSource: "page" }),
          item({ id: "legacy", pageId: undefined, labelSource: undefined }),
          item({ id: "other", label: "Other", url: "/other" }),
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const references = await getCmsPageMenuReferences(page({ title: "About", slug: "about" }));

    expect(references.map((reference) => reference.itemId)).toEqual(["linked", "legacy"]);
    expect(references[0]).toMatchObject({
      menuName: "Main Navigation",
      menuLocation: "main_navigation",
      depth: 1,
    });
  });

  it("removes linked and legacy menu items for a page", () => {
    const result = removeMenuItemsForPage(
      [
        item({ id: "linked", pageId: "page-1", labelSource: "page" }),
        item({ id: "legacy", pageId: undefined, labelSource: undefined }),
        item({ id: "other", label: "Other", url: "/other" }),
      ],
      page({ title: "About", slug: "about" }),
    );

    expect(result.changed).toBe(true);
    expect(result.itemsRemoved).toBe(2);
    expect(result.items.map((entry) => entry.id)).toEqual(["other"]);
  });

  it("removes nested menu references without dropping their siblings", () => {
    const result = removeMenuItemsForPage(
      [
        item({
          id: "parent",
          label: "Resources",
          url: "#",
          children: [
            item({ id: "child-reference", pageId: "page-1", labelSource: "page" }),
            item({ id: "child-other", label: "Other", url: "/other" }),
          ],
        }),
      ],
      page({ title: "About", slug: "about" }),
    );

    expect(result.itemsRemoved).toBe(1);
    expect(result.items[0]?.children.map((entry) => entry.id)).toEqual(["child-other"]);
  });
});
