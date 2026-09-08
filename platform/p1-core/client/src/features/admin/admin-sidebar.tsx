import { useBranding } from "@/components/shared/branding-provider";
import { ThemeModeToggle } from "@/components/shared/theme-mode-toggle";
import { UserProfileDialog } from "@/components/shared/user-profile-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AdminBreadcrumbs, findAdminBreadcrumbTarget } from "@/features/admin/admin-breadcrumbs";
import {
  AdminCommandPalette,
  buildAdminCommandItems,
} from "@/features/admin/admin-command-palette";
import { useAuth } from "@/hooks/use-auth";
import { STALE_TIMES } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import type { User as AppUser } from "@shared/schema";
import { DEFAULT_SITE_FEATURES, type SiteFeatures } from "@shared/site-features";
import type { AdminPermission } from "@shared/types";
import { useQuery } from "@tanstack/react-query";
import {
  Blocks,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  FileCode,
  FileText,
  Globe,
  Handshake,
  Image,
  Images,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Palette,
  PanelRight,
  Plus,
  SearchIcon,
  Settings,
  Share2,
  SquarePen,
  Type,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
const logoIcon = "/p1-symbol.svg";

export interface NavItem {
  title: string;
  href?: string;
  icon: React.ElementType;
  iconColor: string;
  children?: NavItem[];
  collapsibleChildren?: boolean;
  show?: boolean;
}

export interface NavGroup {
  label?: string;
  href?: string;
  items: NavItem[];
}

export function buildNavGroups(
  siteFeatures: SiteFeatures,
  user: AppUser | null,
  hasAdminPermission: (permission: AdminPermission) => boolean,
): NavGroup[] {
  const groups: NavGroup[] = [
    {
      items: [
        ...(user?.role === "admin"
          ? [
              {
                title: "Dashboard",
                href: "/admin",
                icon: LayoutDashboard,
                iconColor: "text-teal-600",
              } satisfies NavItem,
            ]
          : []),
      ],
    },

    ...(siteFeatures.crmEnabled && hasAdminPermission("crm")
      ? ([
          {
            label: "CRM",
            items: [
              {
                title: "Pipeline",
                href: "/admin/crm",
                icon: Handshake,
                iconColor: "text-blue-600",
              },
              {
                title: "Clients",
                href: "/admin/crm/clients",
                icon: UserCheck,
                iconColor: "text-emerald-600",
              },
              ...(user?.role === "admin"
                ? [
                    {
                      title: "Settings",
                      href: "/admin/crm/settings",
                      icon: Settings,
                      iconColor: "text-slate-500",
                    },
                  ]
                : []),
            ],
          },
        ] satisfies NavGroup[])
      : []),

    ...(hasAdminPermission("content")
      ? ([
          {
            label: "Content",
            href: siteFeatures.cmsEnabled ? "/admin/cms" : undefined,
            items: [
              ...(siteFeatures.cmsEnabled
                ? [
                    {
                      title: "Private proof",
                      href: "/admin/cms/private-proof",
                      icon: Globe,
                      iconColor: "text-violet-600",
                    } satisfies NavItem,
                    {
                      title: "P1 Website",
                      href: "/admin/cms/website",
                      icon: Globe,
                      iconColor: "text-violet-600",
                    } satisfies NavItem,
                  ]
                : []),
              ...(siteFeatures.eventsEnabled
                ? [
                    {
                      title: "Events",
                      collapsibleChildren: true,
                      href: "/admin/events",
                      icon: CalendarDays,
                      iconColor: "text-purple-600",
                      children: [
                        {
                          title: "Create Event",
                          href: "/admin/events/new",
                          icon: CalendarPlus,
                          iconColor: "text-purple-500",
                        },
                        {
                          title: "Settings",
                          href: "/admin/events/settings",
                          icon: Settings,
                          iconColor: "text-purple-500",
                        },
                      ],
                    },
                  ]
                : []),
              ...(siteFeatures.careersEnabled
                ? [
                    {
                      title: "Careers",
                      collapsibleChildren: true,
                      href: "/admin/careers",
                      icon: BriefcaseBusiness,
                      iconColor: "text-cyan-600",
                      children: [
                        {
                          title: "Add New",
                          href: "/admin/careers/new",
                          icon: Plus,
                          iconColor: "text-cyan-500",
                        },
                        {
                          title: "Settings",
                          href: "/admin/careers/settings",
                          icon: Settings,
                          iconColor: "text-slate-500",
                        },
                      ],
                    },
                  ]
                : []),
              ...(siteFeatures.cmsEnabled
                ? [
                    {
                      title: "Team",
                      href: "/admin/cms/team",
                      icon: Users,
                      iconColor: "text-teal-600",
                    } satisfies NavItem,
                    {
                      title: "Pages",
                      href: "/admin/cms/pages",
                      icon: FileCode,
                      iconColor: "text-violet-500",
                    } satisfies NavItem,
                  ]
                : []),
              {
                title: "Forms",
                href: "/admin/forms",
                icon: SquarePen,
                iconColor: "text-violet-500",
              },
              ...(siteFeatures.blogEnabled
                ? [
                    {
                      title: "Blog",
                      href: "/admin/cms/blog",
                      icon: BookOpen,
                      iconColor: "text-purple-600",
                    } satisfies NavItem,
                    {
                      title: "Galleries",
                      href: "/admin/cms/galleries",
                      icon: Images,
                      iconColor: "text-fuchsia-600",
                    } satisfies NavItem,
                  ]
                : []),
              ...(siteFeatures.cmsEnabled
                ? [
                    {
                      title: "Media",
                      href: "/admin/cms/media",
                      icon: Image,
                      iconColor: "text-violet-400",
                    } satisfies NavItem,
                    {
                      title: "Sections",
                      href: "/admin/cms/sections",
                      icon: Blocks,
                      iconColor: "text-violet-400",
                    } satisfies NavItem,
                    {
                      title: "SEO",
                      href: "/admin/cms/seo",
                      icon: SearchIcon,
                      iconColor: "text-violet-400",
                    } satisfies NavItem,
                    {
                      title: "Menus",
                      href: "/admin/cms/menus",
                      icon: MenuIcon,
                      iconColor: "text-violet-500",
                    } satisfies NavItem,
                    {
                      title: "Sidebars & Widgets",
                      href: "/admin/cms/sidebars",
                      icon: PanelRight,
                      iconColor: "text-emerald-500",
                    } satisfies NavItem,
                  ]
                : []),
            ],
          },
        ] satisfies NavGroup[])
      : []),
    ...(hasAdminPermission("design")
      ? ([
          {
            label: "Design",
            items: [
              {
                title: "Branding",
                href: "/admin/design/branding",
                icon: Image,
                iconColor: "text-pink-500",
              },
              {
                title: "Color Palette",
                href: "/admin/design/colors",
                icon: Palette,
                iconColor: "text-rose-500",
              },
              {
                title: "Social Media",
                href: "/admin/design/social-media",
                icon: Share2,
                iconColor: "text-emerald-600",
              },
              {
                title: "Typography",
                href: "/admin/design/typography",
                icon: Type,
                iconColor: "text-sky-600",
              },
            ],
          },
        ] satisfies NavGroup[])
      : []),
    ...(user?.role === "admin"
      ? ([
          {
            label: "System",
            items: [
              {
                title: "Developer Resources",
                href: "/admin/docs",
                icon: FileText,
                iconColor: "text-indigo-600",
              },
              {
                title: "System Backups",
                href: "/admin/system/backups",
                icon: Database,
                iconColor: "text-cyan-600",
              },
              {
                title: "Client Stack Onboarding",
                href: "/admin/client-stack-onboarding",
                icon: Globe,
                iconColor: "text-emerald-600",
              },
              {
                title: "User Manager",
                href: "/admin/users",
                icon: Users,
                iconColor: "text-blue-600",
              },
              {
                title: "Settings",
                href: "/admin/settings/integrations",
                icon: Settings,
                iconColor: "text-slate-500",
              },
            ],
          },
        ] satisfies NavGroup[])
      : []),
  ];

  return groups;
}

interface AdminSidebarProps {
  children: React.ReactNode;
}

export function AdminSidebar({ children }: AdminSidebarProps) {
  const [location] = useLocation();
  const { user, logout, hasAdminPermission } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const branding = useBranding();
  const adminLogo = branding.faviconUrl || logoIcon;
  const { data: siteFeaturesData } = useQuery<SiteFeatures>({
    queryKey: ["/api/site-config"],
    staleTime: STALE_TIMES.LIVE,
  });
  const siteFeatures = siteFeaturesData ?? DEFAULT_SITE_FEATURES;
  const navGroups = buildNavGroups(siteFeatures, user, hasAdminPermission)
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => item.show !== false)
        .map((item) => ({
          ...item,
          children: item.children?.filter((child) => child.show !== false),
        })),
    }))
    .filter((group) => group.items.length > 0);
  const toggleGroup = (label: string, open: boolean) => {
    setOpenGroup(open ? label : null);
  };
  const exactOnlyRoutes = ["/admin", "/admin/cms", "/admin/crm"];
  const isRouteActive = (href?: string) =>
    Boolean(
      href && (location === href || (!exactOnlyRoutes.includes(href) && location.startsWith(href))),
    );
  const isChildRouteActive = (child: NavItem) => {
    if (!child.href) return false;
    if (child.href === "/admin/cms/blog") {
      return (
        location === child.href ||
        location === "/admin/cms/blog/new" ||
        /^\/admin\/cms\/blog\/[^/]+$/.test(location)
      );
    }
    return isRouteActive(child.href);
  };
  const isNavItemActive = (item: NavItem) =>
    isRouteActive(item.href) || Boolean(item.children?.some(isChildRouteActive));
  const activeGroupLabel =
    navGroups.find((group) => group.label && group.items.some(isNavItemActive))?.label ?? null;
  const commandItems = useMemo(() => buildAdminCommandItems(navGroups), [navGroups]);
  const currentCommandItem = findAdminBreadcrumbTarget(commandItems, location);

  useEffect(() => {
    setOpenGroup(activeGroupLabel);
  }, [activeGroupLabel]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location]);

  useEffect(() => {
    const desktopMedia = window.matchMedia(
      "(min-width: 768px), (hover: hover) and (pointer: fine)",
    );
    const closeMobileNavigation = () => {
      if (desktopMedia.matches) setMobileNavOpen(false);
    };
    desktopMedia.addEventListener("change", closeMobileNavigation);
    return () => desktopMedia.removeEventListener("change", closeMobileNavigation);
  }, []);

  const renderNavItem = (item: NavItem, mobile = false) => {
    const navigationCollapsed = mobile ? false : collapsed;
    const testIdSuffix = mobile ? "-mobile" : "";
    const isActive = isRouteActive(item.href);
    const childIsActive = Boolean(item.children?.some(isChildRouteActive));
    const parentIsActive = isActive || childIsActive;
    const itemKey = item.href ?? item.title;
    const childrenOpen = !item.collapsibleChildren || Boolean(openItems[itemKey]);
    const childrenId = `admin-subnav-${item.title.toLowerCase()}${testIdSuffix}`;
    const linkContent = (
      <Link key={item.href ?? item.title} href={item.href ?? "#"} className="min-w-0 flex-1">
        <span
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium cursor-pointer hover-elevate whitespace-nowrap overflow-hidden",
            parentIsActive ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
          data-testid={`link-admin-${item.title.toLowerCase().replace(/\s+/g, "-")}${testIdSuffix}`}
          onClick={() => mobile && setMobileNavOpen(false)}
          title={item.title}
        >
          <item.icon
            className={cn("h-4 w-4 flex-shrink-0", parentIsActive ? "" : item.iconColor)}
          />
          <span
            className={cn(
              "transition-opacity duration-200 flex-1",
              navigationCollapsed ? "opacity-0" : "opacity-100",
            )}
          >
            {item.title}
          </span>
          {item.children && !item.collapsibleChildren && !navigationCollapsed && (
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", childIsActive ? "rotate-180" : "")}
            />
          )}
        </span>
      </Link>
    );

    if (navigationCollapsed) {
      return (
        <Tooltip key={item.href}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {item.title}
          </TooltipContent>
        </Tooltip>
      );
    }

    if (item.children && !navigationCollapsed) {
      return (
        <div key={item.href ?? item.title} className="space-y-0.5">
          <div
            className={cn(
              "flex items-center rounded-md",
              parentIsActive && "bg-primary text-primary-foreground",
            )}
          >
            {linkContent}
            {item.collapsibleChildren && (
              <button
                type="button"
                aria-label={`${childrenOpen ? "Collapse" : "Expand"} ${item.title}`}
                aria-expanded={childrenOpen}
                aria-controls={childrenId}
                onClick={() =>
                  setOpenItems((current) => ({ ...current, [itemKey]: !current[itemKey] }))
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronDown
                  className={cn("h-4 w-4 transition-transform", childrenOpen && "rotate-180")}
                />
              </button>
            )}
          </div>
          <div
            id={childrenId}
            hidden={!childrenOpen}
            className="ml-5 border-l border-border/60 pl-2 space-y-0.5"
          >
            {item.children.map((child) => {
              const childActive = isChildRouteActive(child);
              return (
                <Link key={child.href} href={child.href!}>
                  <span
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm cursor-pointer",
                      childActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                    data-testid={`link-admin-${child.title.toLowerCase().replace(/\s+/g, "-")}${testIdSuffix}`}
                    onClick={() => mobile && setMobileNavOpen(false)}
                  >
                    <child.icon
                      className={cn(
                        "h-3.5 w-3.5 flex-shrink-0",
                        childActive ? "text-primary" : child.iconColor,
                      )}
                    />
                    <span>{child.title}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      );
    }

    return linkContent;
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="admin-shell flex min-h-dvh min-w-0 relative">
        <div className="admin-desktop-sidebar relative flex-shrink-0">
          <aside
            className={cn(
              "admin-sidebar-panel sticky top-0 border-r bg-muted/30 h-dvh flex flex-col transition-[width] duration-300 ease-in-out overflow-hidden",
              collapsed ? "w-[68px]" : "w-64",
            )}
          >
            <div className="p-4">
              <div className="flex items-center gap-3" data-testid="text-admin-title">
                <img
                  src={adminLogo}
                  alt="P1 Land Management"
                  className="h-9 w-9 object-contain flex-shrink-0"
                  data-testid="img-admin-logo"
                />
                <h2
                  className={cn(
                    "admin-sidebar-label font-heading text-lg font-semibold whitespace-nowrap transition-opacity duration-200",
                    collapsed ? "opacity-0 w-0" : "opacity-100",
                  )}
                >
                  Admin Dashboard
                </h2>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "mt-4 w-full justify-start text-muted-foreground",
                  collapsed && "justify-center px-0",
                )}
                onClick={() => setCommandOpen(true)}
                data-testid="button-admin-command-search"
              >
                <SearchIcon className={cn("h-4 w-4", collapsed ? "" : "mr-2")} />
                {!collapsed && (
                  <>
                    <span className="admin-sidebar-label flex-1 text-left">Search</span>
                    <kbd className="admin-sidebar-label rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Cmd K
                    </kbd>
                  </>
                )}
              </Button>
            </div>

            <nav
              className="admin-sidebar-navigation flex flex-col gap-1 px-2 flex-1 overflow-y-auto"
              data-testid="nav-admin-sidebar"
            >
              {navGroups.map((group, groupIdx) => {
                const groupKey = group.label ?? `group-${groupIdx}`;
                const groupIsOpen = !group.label || openGroup === group.label;

                if (!group.label || collapsed) {
                  return (
                    <div key={groupKey} className="flex flex-col gap-0.5">
                      {groupIdx > 0 && <Separator className="my-2" />}
                      {group.label && !collapsed && (
                        <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                          {group.label}
                        </p>
                      )}
                      {group.items.map((item) => renderNavItem(item))}
                    </div>
                  );
                }

                return (
                  <Collapsible
                    key={groupKey}
                    open={groupIsOpen}
                    onOpenChange={(open) => toggleGroup(group.label!, open)}
                    className="flex flex-col gap-0.5"
                  >
                    {groupIdx > 0 && <Separator className="my-2" />}
                    <div className="flex items-center">
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "admin-sidebar-group-trigger flex items-center gap-2 rounded-md px-3 py-1 text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground",
                            group.href ? "shrink-0" : "w-full",
                          )}
                          aria-label={`${groupIsOpen ? "Collapse" : "Expand"} ${group.label}`}
                          data-testid={`button-toggle-admin-section-${group.label.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          <ChevronRight
                            className={cn(
                              "h-3 w-3 flex-shrink-0 transition-transform",
                              groupIsOpen ? "rotate-90" : "",
                            )}
                          />
                          {!group.href && (
                            <span className="min-w-0 flex-1 truncate">{group.label}</span>
                          )}
                        </button>
                      </CollapsibleTrigger>
                      {group.href && (
                        <Link
                          href={group.href}
                          onClick={() => setOpenGroup(group.label!)}
                          className="min-w-0 flex-1 rounded-md py-2 pr-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          data-testid="link-admin-section-content"
                        >
                          {group.label}
                        </Link>
                      )}
                    </div>
                    <CollapsibleContent className="admin-sidebar-group-content flex flex-col gap-0.5 overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                      {group.items.map((item) => renderNavItem(item))}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </nav>

            {user && (
              <div className="admin-sidebar-account px-2 pb-4">
                <Separator className="mb-3" />
                {!collapsed && (
                  <div className="px-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {user.firstName?.[0]}
                          {user.lastName?.[0]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          data-testid="text-sidebar-username"
                        >
                          {user.firstName} {user.lastName}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize"
                          data-testid="badge-sidebar-role"
                        >
                          {user.role}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  {collapsed ? (
                    <>
                      <ThemeModeToggle collapsed />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="mx-auto h-7 w-7 rounded-full border border-border bg-background flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-ring hover:ring-offset-1 transition-shadow"
                            onClick={() => setProfileOpen(true)}
                            data-testid="button-sidebar-profile"
                          >
                            {user?.profileImageUrl ? (
                              <img
                                src={user.profileImageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                          My Profile
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-center text-muted-foreground"
                            onClick={() => logout.mutate()}
                            data-testid="button-sidebar-logout"
                          >
                            <LogOut className="h-4 w-4 text-rose-500" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8}>
                          Logout
                        </TooltipContent>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <ThemeModeToggle />
                      <button
                        type="button"
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setProfileOpen(true)}
                        data-testid="button-sidebar-profile"
                      >
                        <span className="h-6 w-6 rounded-full border border-border bg-background flex items-center justify-center overflow-hidden shrink-0">
                          {user?.profileImageUrl ? (
                            <img
                              src={user.profileImageUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-4 w-4 text-muted-foreground" />
                          )}
                        </span>
                        My Profile
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => logout.mutate()}
                        data-testid="button-sidebar-logout"
                      >
                        <LogOut className="h-4 w-4 mr-2 text-rose-500" />
                        Logout
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </aside>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="admin-sidebar-toggle absolute top-6 -right-3.5 z-20 h-7 w-7 rounded-full border bg-background shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:shadow-md transition-all"
            data-testid="button-toggle-sidebar"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="admin-mobile-header sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
            <div className="flex h-14 items-center gap-3 px-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open admin navigation"
                data-testid="button-open-admin-navigation"
              >
                <MenuIcon className="h-5 w-5" />
              </Button>
              <img src={adminLogo} alt="" className="h-8 w-8 shrink-0 object-contain" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {currentCommandItem?.title ?? "Admin Dashboard"}
                </p>
                {currentCommandItem?.groupLabel && (
                  <p className="truncate text-xs text-muted-foreground">
                    {currentCommandItem.groupLabel}
                  </p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => setCommandOpen(true)}
                aria-label="Search admin"
                data-testid="button-admin-command-search-mobile"
              >
                <SearchIcon className="h-5 w-5" />
              </Button>
            </div>
          </header>

          <main className="admin-main min-w-0 flex-1">
            <AdminBreadcrumbs items={commandItems} />
            {children}
          </main>
        </div>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent
            side="left"
            className="admin-mobile-drawer w-[min(88vw,22rem)] gap-0 p-0"
            data-testid="admin-mobile-navigation"
          >
            <SheetHeader className="border-b p-4 pr-12">
              <div className="flex items-center gap-3">
                <img src={adminLogo} alt="P1 Land Management" className="h-9 w-9 object-contain" />
                <SheetTitle>Admin Dashboard</SheetTitle>
              </div>
              <SheetDescription className="sr-only">
                Navigate the administration area
              </SheetDescription>
            </SheetHeader>
            <div className="px-3 pt-3">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-muted-foreground"
                onClick={() => {
                  setMobileNavOpen(false);
                  setCommandOpen(true);
                }}
              >
                <SearchIcon className="mr-2 h-4 w-4" />
                Search admin
              </Button>
            </div>
            <SheetBody className="p-2">
              <nav className="flex flex-col gap-1" data-testid="nav-admin-sidebar-mobile">
                {navGroups.map((group, groupIdx) => (
                  <div key={group.label ?? `mobile-group-${groupIdx}`} className="space-y-0.5">
                    {groupIdx > 0 && <Separator className="my-2" />}
                    {group.label && (
                      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                        {group.href ? (
                          <Link href={group.href} onClick={() => setMobileNavOpen(false)}>
                            {group.label}
                          </Link>
                        ) : (
                          group.label
                        )}
                      </p>
                    )}
                    {group.items.map((item) => renderNavItem(item, true))}
                  </div>
                ))}
              </nav>
            </SheetBody>
            {user && (
              <div className="border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <div className="mb-2 flex items-center gap-2 px-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-background">
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs capitalize text-muted-foreground">{user.role}</p>
                  </div>
                </div>
                <ThemeModeToggle />
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => {
                    setMobileNavOpen(false);
                    setProfileOpen(true);
                  }}
                >
                  <User className="h-4 w-4" />
                  My Profile
                </button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => logout.mutate()}
                >
                  <LogOut className="mr-2 h-4 w-4 text-rose-500" />
                  Logout
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>

        <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
        <AdminCommandPalette
          items={commandItems}
          open={commandOpen}
          onOpenChange={setCommandOpen}
        />
      </div>
    </TooltipProvider>
  );
}
