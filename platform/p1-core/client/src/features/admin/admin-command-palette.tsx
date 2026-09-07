import React, { useEffect } from "react";
import { useLocation } from "wouter";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { NavGroup, NavItem } from "@/features/admin/admin-sidebar";

export interface AdminCommandItem {
  id: string;
  title: string;
  href: string;
  groupLabel: string;
  keywords: string[];
  icon: React.ElementType;
  iconColor?: string;
}

const EXTRA_ADMIN_COMMANDS: AdminCommandItem[] = [
  {
    id: "settings-head-tags",
    title: "Head Tags",
    href: "/admin/settings/head-tags",
    groupLabel: "System",
    keywords: ["settings", "seo", "scripts"],
    icon: () => null,
  },
  {
    id: "settings-system",
    title: "System Settings",
    href: "/admin/settings/system",
    groupLabel: "System",
    keywords: ["settings", "system"],
    icon: () => null,
  },
  {
    id: "settings-email-templates",
    title: "Email Templates",
    href: "/admin/settings/email-templates",
    groupLabel: "System",
    keywords: ["settings", "email", "templates"],
    icon: () => null,
  },
  {
    id: "ecommerce-refunds",
    title: "Refunds",
    href: "/admin/ecommerce/refunds",
    groupLabel: "Ecommerce",
    keywords: ["store", "orders", "returns"],
    icon: () => null,
  },
];

function pushNavItemCommands(
  items: AdminCommandItem[],
  item: NavItem,
  groupLabel: string,
  parentTitle?: string,
) {
  if (item.href) {
    items.push({
      id: item.href,
      title: item.title,
      href: item.href,
      groupLabel,
      keywords: [groupLabel, parentTitle, item.title].filter(Boolean) as string[],
      icon: item.icon,
      iconColor: item.iconColor,
    });
  }

  item.children?.forEach((child) => pushNavItemCommands(items, child, groupLabel, item.title));
}

export function buildAdminCommandItems(navGroups: NavGroup[]): AdminCommandItem[] {
  const items: AdminCommandItem[] = [];

  navGroups.forEach((group) => {
    const groupLabel = group.label ?? "Admin";
    group.items.forEach((item) => pushNavItemCommands(items, item, groupLabel));
  });

  const allowedGroupLabels = new Set(items.map((item) => item.groupLabel));
  const allowedParents = new Set(items.map((item) => item.href));
  EXTRA_ADMIN_COMMANDS.forEach((item) => {
    const parentHref = item.href.split("/").slice(0, 3).join("/");
    if (allowedGroupLabels.has(item.groupLabel) || allowedParents.has(parentHref)) {
      items.push(item);
    }
  });

  const byHref = new Map<string, AdminCommandItem>();
  items.forEach((item) => byHref.set(item.href, item));
  return [...byHref.values()].sort((a, b) =>
    `${a.groupLabel} ${a.title}`.localeCompare(`${b.groupLabel} ${b.title}`),
  );
}

interface AdminCommandPaletteProps {
  items: AdminCommandItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdminCommandPalette({ items, open, onOpenChange }: AdminCommandPaletteProps) {
  const [, navigate] = useLocation();
  const groups = items.reduce<Record<string, AdminCommandItem[]>>((acc, item) => {
    acc[item.groupLabel] = acc[item.groupLabel] ?? [];
    acc[item.groupLabel].push(item);
    return acc;
  }, {});

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpenChange, open]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search admin..." data-testid="input-admin-command-search" />
      <CommandList>
        <CommandEmpty>No admin sections found.</CommandEmpty>
        {Object.entries(groups).map(([groupLabel, groupItems]) => (
          <CommandGroup key={groupLabel} heading={groupLabel}>
            {groupItems.map((item) => (
              <CommandItem
                key={item.id}
                value={[item.title, item.groupLabel, ...item.keywords].join(" ")}
                onSelect={() => {
                  onOpenChange(false);
                  navigate(item.href);
                }}
                data-testid={`command-admin-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <item.icon className={item.iconColor} />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
