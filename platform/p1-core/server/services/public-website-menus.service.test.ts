import { describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ transaction: vi.fn(), manifest: vi.fn() }));
vi.mock("../db", () => ({ db: { transaction: state.transaction } }));
vi.mock("./client-site-content.service", () => ({
  loadConfiguredClientSiteManifest: state.manifest,
}));
import { getPublicWebsiteMenus, projectPublicWebsiteMenus } from "./public-website-menus.service";
import { isSafePublicMenuUrl, MAX_PUBLIC_MENU_BYTES } from "../../shared/public-menus";
const item = (patch: Record<string, unknown> = {}) => ({
  id: "i",
  label: "Contact",
  url: "/contact",
  openInNewTab: false,
  children: [],
  ...patch,
});
const menu = (items: unknown = [item()], patch: Record<string, unknown> = {}) => ({
  id: "m",
  version: 1,
  location: "main_navigation",
  items,
  ...patch,
});
const project = (menus = [menu()], pages: any[] = [], forms: any[] = []) =>
  projectPublicWebsiteMenus(menus, pages, forms, ["/", "/contact", "/about"]);
describe("public website menu projection", () => {
  it("distinguishes unassigned, intentional empty and legacy-only configuration", () => {
    expect(Object.values(project([]).locations)).toEqual([null, null, null, null]);
    expect(project([menu([])]).locations.main_navigation).toEqual({
      id: "m",
      version: 1,
      items: [],
    });
    expect(Object.values(project([menu([], { location: "footer" })]).locations)).toEqual([
      null,
      null,
      null,
      null,
    ]);
  });
  it("never exposes draft, missing or unroutable page metadata or descendants", () => {
    const pages = [
      { id: "draft", status: "draft", title: "Private title", slug: "private" },
      { id: "other", status: "published", title: "Unroutable title", slug: "not-built" },
    ];
    const result = project(
      [
        menu([
          item({
            id: "a",
            pageId: "draft",
            label: "Private cached title",
            url: "/private",
            children: [item({ id: "child" })],
          }),
          item({ id: "b", pageId: "missing" }),
          item({ id: "c", pageId: "other" }),
        ]),
      ],
      pages,
    );
    expect(result.locations.main_navigation?.items).toEqual([]);
    expect(JSON.stringify(result)).not.toMatch(/Private|private|Unroutable|not-built|child|pageId/);
  });
  it("resolves public linked destinations and synced title while retaining authored labels", () => {
    const result = project(
      [
        menu([
          item({
            id: "a",
            pageId: "page",
            labelSource: "page",
            url: "javascript:bad",
            label: "Old title",
          }),
          item({ id: "b", pageId: "page", labelSource: "custom", label: "Authored" }),
        ]),
      ],
      [{ id: "page", status: "published", title: "About us", slug: "about" }],
    );
    expect(result.locations.main_navigation?.items.map((i) => [i.label, i.url, i.action])).toEqual([
      ["About us", "/about", "internal-link"],
      ["Authored", "/about", "internal-link"],
    ]);
    expect(JSON.stringify(result)).not.toMatch(/pageId|labelSource|javascript/);
  });
  it("projects eligible form-modal actions without leaking form metadata", () => {
    const items = ["active", "inactive", "application", "missing"].map((slug) =>
      item({
        id: slug,
        action: "form-modal",
        formSlug: slug,
        modalTitle: "Request",
        modalDescription: "Details",
        url: "javascript:unused",
        openInNewTab: true,
      }),
    );
    const result = project(
      [menu(items)],
      [],
      [
        { slug: "active", isActive: true, kind: "contact", privateRecipient: "secret" },
        { slug: "inactive", isActive: false, kind: "contact" },
        { slug: "application", isActive: true, kind: "application" },
      ],
    );
    expect(result.locations.main_navigation?.items).toEqual([
      {
        id: "active",
        label: "Contact",
        url: "#",
        openInNewTab: false,
        action: "form-modal",
        formSlug: "active",
        modalTitle: "Request",
        modalDescription: "Details",
        children: [],
      },
    ]);
    expect(JSON.stringify(result)).not.toMatch(/secret|privateRecipient/);
  });
  it.each([
    "javascript:alert(1)",
    "data:text/html,bad",
    "//evil.test/x",
    "/\\evil.test",
    "https://user:password@evil.test",
    "/bad%00",
    "/bad%5c",
    "/bad%",
    "https://example.test/a b",
  ])("isolates invalid URL %s from another valid slot", (url) => {
    const result = project([
      menu([item({ url })]),
      menu([item()], { id: "footer", location: "p1_footer_company" }),
    ]);
    expect(result.locations.main_navigation).toBeNull();
    expect(result.locations.p1_footer_company?.items).toHaveLength(1);
  });
  it("supports safe link targets and normalizes irrelevant modal data away", () => {
    for (const url of [
      "/contact?source=menu#form",
      "#assessment-request",
      "https://example.test/path",
      "http://example.test",
      "mailto:hello@example.test",
      "tel:+18005551212",
    ])
      expect(isSafePublicMenuUrl(url)).toBe(true);
    const projected = project([
      menu([
        item({
          modalTitle: "Unused",
          modalDescription: "Unused",
          formSlug: "unused",
          action: "custom-link",
        }),
      ]),
    ]);
    expect(projected.locations.main_navigation?.items[0]).toMatchObject({
      formSlug: null,
      modalTitle: null,
      modalDescription: null,
    });
  });
  it("bounds depth, duplicate IDs, counts, slot bytes and invalid metadata independently", () => {
    const tooDeep = item({
      children: [item({ id: "b", children: [item({ id: "c", children: [item({ id: "d" })] })] })],
    });
    const cases = [
      menu([tooDeep]),
      menu([item(), item()]),
      menu(Array.from({ length: 201 }, (_, i) => item({ id: `i${i}` }))),
      menu([item({ label: "x".repeat(301) })]),
      menu([item({ extra: "x".repeat(70000) })]),
      menu([item()], { version: 0 }),
    ];
    for (const invalid of cases) {
      const result = project([invalid, menu([], { id: "footer", location: "p1_footer_company" })]);
      expect(result.locations.main_navigation).toBeNull();
      expect(result.locations.p1_footer_company?.items).toEqual([]);
      expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThanOrEqual(MAX_PUBLIC_MENU_BYTES);
    }
    expect(project([menu(), menu()]).locations.main_navigation).toBeNull();
  });
  it("accepts three levels, strips extra fields and hashes only the public projection deterministically", () => {
    const m = menu([item({ children: [item({ id: "b", children: [item({ id: "c" })] })] })]);
    const result = project([m]);
    expect(result.locations.main_navigation?.items[0].children[0].children).toHaveLength(1);
    expect(result.revision).toMatch(/^[a-f0-9]{64}$/);
    expect(project([{ ...m, createdBy: "private-user" } as any]).revision).toBe(result.revision);
    expect(project([menu(m.items, { version: 2 })]).revision).not.toBe(result.revision);
  });
});

it("reads bounded explicit columns in a repeatable-read read-only transaction", async () => {
  state.manifest.mockResolvedValue({
    client: { stackId: "p1-land-management" },
    origins: { publicSite: "https://www.p1landmanagement.com" },
    routes: [{ path: "/about" }],
  });
  const rows = [
    [
      menu([
        item({ pageId: "public", labelSource: "page" }),
        item({ id: "form", action: "form-modal", formSlug: "contact" }),
      ]),
    ],
    [],
    [],
    [],
    [{ id: "public", title: "About", slug: "about", status: "published" }],
    [{ slug: "contact", isActive: true, kind: "contact" }],
  ];
  const selections: string[][] = [],
    limits: number[] = [];
  const execute = vi.fn();
  state.transaction.mockImplementation(async (work, options) => {
    expect(options).toEqual({ isolationLevel: "repeatable read", accessMode: "read only" });
    return work({
      execute,
      select: (columns: Record<string, unknown>) => {
        selections.push(Object.keys(columns));
        return {
          from: () => ({
            where: () => ({
              limit: async (n: number) => {
                limits.push(n);
                return rows.shift();
              },
              then: (resolve: (value: unknown) => unknown) => resolve(rows.shift()),
            }),
          }),
        };
      },
    });
  });
  const result = await getPublicWebsiteMenus();
  expect(result.locations.main_navigation?.items).toHaveLength(2);
  expect(limits).toEqual([2, 2, 2, 2]);
  expect(selections).toEqual([
    ...[0, 1, 2, 3].map(() => ["id", "version", "location", "items"]),
    ["id", "status", "title", "slug"],
    ["slug", "isActive", "kind"],
  ]);
  expect(execute).toHaveBeenCalledTimes(1);
  expect(rows).toHaveLength(0);
});
it("refuses another stack manifest before querying menu rows", async () => {
  state.transaction.mockClear();
  state.manifest.mockResolvedValue({
    client: { stackId: "another" },
    origins: { publicSite: "https://www.p1landmanagement.com" },
  });
  await expect(getPublicWebsiteMenus()).rejects.toThrow("Unexpected website manifest");
  expect(state.transaction).not.toHaveBeenCalled();
});
