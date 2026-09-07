import { describe, expect, it } from "vitest";
import { DEFAULT_SITE_FEATURES } from "@shared/site-features";
import type { AdminPermission } from "@shared/types";
import type { User } from "@shared/schema";
import type { PublicDirectorySettings } from "@shared/types/directory-settings";
import { buildNavGroups } from "@/features/admin/admin-sidebar";
import { buildAdminCommandItems } from "@/features/admin/admin-command-palette";
import { findAdminBreadcrumbTarget } from "@/features/admin/admin-breadcrumbs";

const adminUser = {
  id: "user-1",
  username: "admin",
  email: "admin@example.com",
  role: "admin",
} as User;

const directorySettings = {
  directoryLabelSingular: "Provider Directory",
  directoryLabelPlural: "Providers",
  listingLabelPlural: "Listings",
  specialtyLabelPlural: "Specialties",
  directoryRequiresApplicationProcess: true,
} as PublicDirectorySettings;

describe("buildNavGroups", () => {
  it("groups website content once and preserves feature and permission gates", () => {
    const enabled = {
      ...DEFAULT_SITE_FEATURES,
      cmsEnabled: true,
      eventsEnabled: true,
      careersEnabled: true,
    };
    const groups = buildNavGroups(enabled, adminUser, () => true, directorySettings);
    const content = groups.find((group) => group.label === "Content")!;
    expect(content.href).toBe("/admin/cms");
    expect(content.items[0]).toMatchObject({ title: "P1 Website", href: "/admin/cms/website" });
    expect(content.items.map((item) => item.title)).toEqual(
      expect.arrayContaining(["Events", "Careers", "Team"]),
    );
    expect(
      groups.some((group) => ["Event Management", "Career Center"].includes(group.label || "")),
    ).toBe(false);
    for (const title of ["Events", "Careers", "Team"]) {
      expect(
        groups.flatMap((group) => group.items).filter((item) => item.title === title),
      ).toHaveLength(1);
    }
    expect(
      buildNavGroups(enabled, adminUser, () => false, directorySettings).some(
        (group) => group.label === "Content",
      ),
    ).toBe(false);
    const disabled = buildNavGroups(
      { ...enabled, cmsEnabled: false, eventsEnabled: false, careersEnabled: false },
      adminUser,
      () => true,
      directorySettings,
    );
    expect(
      disabled
        .flatMap((group) => group.items)
        .some((item) => ["Events", "Careers", "Team"].includes(item.title)),
    ).toBe(false);
  });
  it("places Event Settings under Content after Create Event", () => {
    const groups = buildNavGroups(
      { ...DEFAULT_SITE_FEATURES, eventsEnabled: true },
      adminUser,
      (permission: AdminPermission) => permission === "content",
      directorySettings,
    );

    const eventGroup = groups.find((group) => group.label === "Content");
    const eventChildren = eventGroup?.items.find((item) => item.title === "Events")?.children ?? [];

    expect(eventChildren.map((item) => ({ title: item.title, href: item.href }))).toEqual([
      { title: "Create Event", href: "/admin/events/new" },
      { title: "Settings", href: "/admin/events/settings" },
    ]);
  });

  it("places Careers Add New and Settings under Content", () => {
    const groups = buildNavGroups(
      { ...DEFAULT_SITE_FEATURES, careersEnabled: true },
      adminUser,
      (permission: AdminPermission) => permission === "content",
      directorySettings,
    );

    const careersGroup = groups.find((group) => group.label === "Content");
    const careersChildren =
      careersGroup?.items.find((item) => item.title === "Careers")?.children ?? [];

    expect(careersChildren.map((item) => ({ title: item.title, href: item.href }))).toEqual([
      { title: "Add New", href: "/admin/careers/new" },
      { title: "Settings", href: "/admin/careers/settings" },
    ]);
  });

  it("builds command palette items from gated navigation and known sub-routes", () => {
    const navGroups = buildNavGroups(
      { ...DEFAULT_SITE_FEATURES, ecommerceEnabled: true, eventsEnabled: true },
      adminUser,
      () => true,
      directorySettings,
    );

    const commands = buildAdminCommandItems(navGroups);
    const hrefs = commands.map((item) => item.href);

    expect(hrefs).toContain("/admin/events/new");
    expect(hrefs).toContain("/admin/events/settings");
    expect(hrefs).not.toContain("/admin/ecommerce/refunds");
    expect(hrefs).toContain("/admin/settings/email-templates");
  });

  it("omits app command items when the feature gate removes the nav group", () => {
    const navGroups = buildNavGroups(
      { ...DEFAULT_SITE_FEATURES, ecommerceEnabled: false },
      adminUser,
      () => true,
      directorySettings,
    );

    const commands = buildAdminCommandItems(navGroups);

    expect(commands.some((item) => item.href.startsWith("/admin/ecommerce"))).toBe(false);
  });

  it("uses the same command model to label nested responsive admin routes", () => {
    const navGroups = buildNavGroups(
      { ...DEFAULT_SITE_FEATURES, eventsEnabled: true },
      adminUser,
      () => true,
      directorySettings,
    );
    const commands = buildAdminCommandItems(navGroups);

    expect(
      findAdminBreadcrumbTarget(commands, "/admin/events/settings?tab=registration")?.href,
    ).toBe("/admin/events/settings");
    expect(findAdminBreadcrumbTarget(commands, "/admin/events/new")?.title).toBe("Create Event");
  });
});
