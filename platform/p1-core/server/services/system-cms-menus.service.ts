import { randomUUID } from "crypto";
import { storage } from "../storage";
import type { InsertCmsMenu, MenuItem, StandardMenuLocation } from "@shared/schema";

function id() {
  return randomUUID();
}

function item(
  label: string,
  url: string,
  children: MenuItem[] = [],
  openInNewTab = false,
): MenuItem {
  return {
    id: id(),
    label,
    url,
    openInNewTab,
    children,
  };
}

function patchLegalItemUrls(items: MenuItem[]): { items: MenuItem[]; changed: boolean } {
  let changed = false;

  const nextItems = items.map((entry) => {
    const nextChildren = entry.children?.length
      ? patchLegalItemUrls(entry.children)
      : { items: entry.children ?? [], changed: false };

    const normalizedLabel = entry.label.trim().toLowerCase();
    let nextUrl = entry.url;

    if (
      normalizedLabel === "privacy policy" &&
      (entry.url === "/contact" || entry.url === "" || entry.url === "#")
    ) {
      nextUrl = "/privacy-policy";
      changed = true;
    }

    if (
      normalizedLabel === "terms of service" &&
      (entry.url === "/contact" || entry.url === "" || entry.url === "#")
    ) {
      nextUrl = "/terms-of-service";
      changed = true;
    }

    if (
      normalizedLabel === "disclaimer" &&
      (entry.url === "/contact" || entry.url === "" || entry.url === "#")
    ) {
      nextUrl = "/disclaimer";
      changed = true;
    }

    if (nextChildren.changed) {
      changed = true;
    }

    return {
      ...entry,
      url: nextUrl,
      children: nextChildren.items,
    };
  });

  const hasDisclaimer = nextItems.some(
    (entry) => entry.label.trim().toLowerCase() === "disclaimer",
  );
  if (!hasDisclaimer) {
    nextItems.push(item("Disclaimer", "/disclaimer"));
    changed = true;
  }

  return { items: nextItems, changed };
}

function patchShopItem(items: MenuItem[]): { items: MenuItem[]; changed: boolean } {
  const hasShop = items.some(
    (entry) => entry.label.trim().toLowerCase() === "shop" || entry.url === "/shop",
  );
  if (hasShop) return { items, changed: false };

  const nextItems = [...items];
  const contactIndex = nextItems.findIndex(
    (entry) => entry.label.trim().toLowerCase() === "contact",
  );
  const insertIndex = contactIndex >= 0 ? contactIndex : nextItems.length;
  nextItems.splice(insertIndex, 0, item("Shop", "/shop"));
  return { items: nextItems, changed: true };
}

const NEUTRAL_MENU_LABELS: Record<string, string> = {
  "Applications open in June": "Apply to Join",
  "About the Community": "About the Platform",
  "Browse Specializations": "Browse the Directory",
};

function patchNeutralMenuLabels(items: MenuItem[]): { items: MenuItem[]; changed: boolean } {
  let changed = false;

  const nextItems = items.map((entry) => {
    const nextChildren = entry.children?.length
      ? patchNeutralMenuLabels(entry.children)
      : { items: entry.children ?? [], changed: false };
    const nextLabel = NEUTRAL_MENU_LABELS[entry.label] ?? entry.label;

    if (nextLabel !== entry.label || nextChildren.changed) {
      changed = true;
    }

    return {
      ...entry,
      label: nextLabel,
      children: nextChildren.items,
    };
  });

  return { items: nextItems, changed };
}

const defaultMenus: Array<InsertCmsMenu & { location: StandardMenuLocation }> = [
  {
    name: "Main Navigation",
    location: "main_navigation",
    items: [
      item("About", "/about"),
      item("Find a Verified Provider", "/directory"),
      item("Join the Network", "/join"),
      item("Resources", "#", [item("Events", "/events"), item("Insights & Articles", "/insights")]),
      item("Shop", "/shop"),
      item("Contact", "/contact"),
    ],
  },
  {
    name: "Platform",
    location: "footer_platform",
    items: [
      item("Find a Verified Provider", "/directory"),
      item("Events & Workshops", "/events"),
      item("How It Works", "/about"),
    ],
  },
  {
    name: "For Verified Providers",
    location: "footer_professionals",
    items: [
      item("Apply to Join", "/join"),
      item("Verified Provider Login", "/auth/login"),
      item("Membership Plans", "/therapist/subscription"),
    ],
  },
  {
    name: "Resources",
    location: "footer_resources",
    items: [
      item("About the Platform", "/about"),
      item("Upcoming Events", "/events"),
      item("Browse the Directory", "/directory"),
    ],
  },
  {
    name: "Company",
    location: "footer_company",
    items: [item("About Us", "/about"), item("Contact", "/contact"), item("Support", "/contact")],
  },
  {
    name: "Legal",
    location: "footer_legal",
    items: [
      item("Privacy Policy", "/privacy-policy"),
      item("Terms of Service", "/terms-of-service"),
      item("Disclaimer", "/disclaimer"),
    ],
  },
];

export async function ensureSystemCmsMenus() {
  const menus = await storage.cmsMenus.getAll();
  const assignedLocations = new Set(menus.map((menu) => menu.location));

  const hasAnyHeaderMenu =
    assignedLocations.has("main_navigation") || assignedLocations.has("header");
  const hasAnyThemeMenu = menus.some((menu) => menu.location !== "unassigned");
  if (!hasAnyHeaderMenu && !hasAnyThemeMenu) {
    const mainNavigation = defaultMenus.find((menu) => menu.location === "main_navigation");
    if (mainNavigation) {
      await storage.cmsMenus.create(mainNavigation);
    }
  }

  const hasAnyFooterMenus =
    assignedLocations.has("footer") ||
    defaultMenus
      .filter((entry) => entry.location !== "main_navigation")
      .some((entry) => assignedLocations.has(entry.location));
  if (!hasAnyFooterMenus) {
    for (const menu of defaultMenus.filter((entry) => entry.location !== "main_navigation")) {
      await storage.cmsMenus.create(menu);
    }
  }

  const legalMenu = await storage.cmsMenus.getByLocation("footer_legal");
  if (legalMenu?.items) {
    const patched = patchLegalItemUrls((legalMenu.items as MenuItem[]) || []);
    if (patched.changed) {
      await storage.cmsMenus.update(legalMenu.id, {
        items: patched.items,
      });
    }
  }

  const mainMenu = await storage.cmsMenus.getByLocation("main_navigation");
  if (mainMenu?.items) {
    const withShop = patchShopItem((mainMenu.items as MenuItem[]) || []);
    const patched = patchNeutralMenuLabels(withShop.items);
    if (withShop.changed || patched.changed) {
      await storage.cmsMenus.update(mainMenu.id, {
        items: patched.items,
      });
    }
  }

  for (const location of ["footer_professionals", "footer_resources", "footer"] as const) {
    const menu = await storage.cmsMenus.getByLocation(location);
    if (!menu?.items) continue;

    const patched = patchNeutralMenuLabels((menu.items as MenuItem[]) || []);
    if (patched.changed) {
      await storage.cmsMenus.update(menu.id, {
        items: patched.items,
      });
    }
  }
}
