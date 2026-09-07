import { STALE_TIMES } from "@/lib/queryClient";
import { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  Menu,
  User,
  LogOut,
  LayoutDashboard,
  Shield,
  UserCog,
  ChevronDown,
  Bell,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useUnreadNotificationCount } from "@/hooks/use-unread-notification-count";
const logoImg = "/p1-symbol.svg";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBranding } from "@/components/shared/branding-provider";
import { useAuth } from "@/hooks/use-auth";
import { UserProfileDialog } from "@/components/shared/user-profile-dialog";
import { NotificationBell } from "@/components/shared/notification-bell";
import { NavbarSearchPopover } from "@/components/layout/navbar-search-popover";
import { FormModalButton } from "@/components/forms/form-modal-button";
import { getCartItemCount, readCart, type CartItem } from "@/features/ecommerce/cart-store";
import { MiniCartDrawer } from "@/features/ecommerce/mini-cart-drawer";
import { DEFAULT_SITE_FEATURES, type SiteFeatures } from "@shared/site-features";
import { useDirectorySettings } from "@/hooks/use-directory-settings";
import { getDirectoryExperienceMode } from "@shared/types/directory-settings";
import type { CmsMenu, MenuItem, PublicMenuLocation } from "@shared/schema";

const allResourceLinks = [
  { label: "Events", href: "/events" },
  { label: "Recording Archives", href: "/recordings", hideFromClients: true },
  { label: "Insights & Articles", href: "/insights" },
];

function flattenItems(items: MenuItem[], depth = 0): { item: MenuItem; depth: number }[] {
  const result: { item: MenuItem; depth: number }[] = [];
  for (const item of items) {
    result.push({ item, depth });
    if (item.children?.length > 0) {
      result.push(...flattenItems(item.children, depth + 1));
    }
  }
  return result;
}

function isActiveRecursive(items: MenuItem[], currentPath: string): boolean {
  for (const item of items) {
    if (currentPath === item.url) return true;
    if (item.children?.length > 0 && isActiveRecursive(item.children, currentPath)) return true;
  }
  return false;
}

function menuTestId(item: MenuItem, prefix = "link-nav") {
  return `${prefix}-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function isModalMenuItem(item: MenuItem) {
  return item.action === "form-modal" && Boolean(item.formSlug);
}

function DynamicMenuButton({
  item,
  location: currentPath,
  child = false,
}: {
  item: MenuItem;
  location: string;
  child?: boolean;
}) {
  if (isModalMenuItem(item)) {
    return (
      <FormModalButton
        label={item.label}
        action="form-modal"
        formSlug={item.formSlug}
        modalTitle={item.modalTitle}
        modalDescription={item.modalDescription}
        variant="ghost"
        className={child ? "h-auto w-full justify-start px-0 py-0 font-normal" : undefined}
        testId={child ? `link-nav-child-${item.id}` : menuTestId(item)}
      />
    );
  }

  if (item.openInNewTab) {
    return (
      <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer">
        <Button
          variant="ghost"
          data-testid={child ? `link-nav-child-${item.id}` : menuTestId(item)}
        >
          {item.label}
        </Button>
      </a>
    );
  }

  return (
    <Link key={item.id} href={item.url}>
      <Button
        variant="ghost"
        className={currentPath === item.url ? "toggle-elevate toggle-elevated" : ""}
        data-testid={child ? `link-nav-child-${item.id}` : menuTestId(item)}
        aria-current={currentPath === item.url ? "page" : undefined}
      >
        {item.label}
      </Button>
    </Link>
  );
}

function DynamicDropdown({ item, location: currentPath }: { item: MenuItem; location: string }) {
  const isActive = isActiveRecursive(item.children || [], currentPath);
  const flatChildren = flattenItems(item.children || []);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={isActive ? "toggle-elevate toggle-elevated" : ""}
          data-testid={`link-nav-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
        >
          {item.label}
          <ChevronDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="z-[1000]">
        {flatChildren.map(({ item: child, depth }) => (
          <DropdownMenuItem
            key={child.id}
            asChild={!isModalMenuItem(child)}
            className={depth > 0 ? `pl-${4 + depth * 4}` : ""}
            onSelect={isModalMenuItem(child) ? (event) => event.preventDefault() : undefined}
          >
            {isModalMenuItem(child) ? (
              <div style={depth > 0 ? { paddingLeft: `${12 + depth * 16}px` } : undefined}>
                <DynamicMenuButton item={child} location={currentPath} child />
              </div>
            ) : child.openInNewTab ? (
              <a
                href={child.url}
                target="_blank"
                rel="noopener noreferrer"
                data-testid={`link-nav-child-${child.id}`}
                style={depth > 0 ? { paddingLeft: `${12 + depth * 16}px` } : undefined}
              >
                {child.label}
              </a>
            ) : (
              <Link
                href={child.url}
                data-testid={`link-nav-child-${child.id}`}
                style={depth > 0 ? { paddingLeft: `${12 + depth * 16}px` } : undefined}
              >
                {child.label}
              </Link>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function useCartItems() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const updateCartItems = () => setCartItems(readCart());
    updateCartItems();
    window.addEventListener("ecommerce-cart-changed", updateCartItems);
    window.addEventListener("storage", updateCartItems);
    return () => {
      window.removeEventListener("ecommerce-cart-changed", updateCartItems);
      window.removeEventListener("storage", updateCartItems);
    };
  }, []);

  return cartItems;
}

function CartNavButton({
  cartItemCount,
  compact = false,
  onClick,
}: {
  cartItemCount: number;
  compact?: boolean;
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant={compact ? "ghost" : "outline"}
      size={compact ? "icon" : "sm"}
      className="relative"
      data-testid={compact ? "button-cart-mobile" : "button-cart"}
      aria-label={`Cart${cartItemCount ? `, ${cartItemCount} item${cartItemCount === 1 ? "" : "s"}` : ""}`}
      onClick={onClick}
    >
      <ShoppingCart className={compact ? "h-5 w-5" : "mr-2 h-4 w-4"} />
      {compact ? null : "Cart"}
      {cartItemCount > 0 ? (
        <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-none text-primary-foreground">
          {cartItemCount > 99 ? "99+" : cartItemCount}
        </span>
      ) : null}
    </Button>
  );
}

export function Navbar() {
  const [location] = useLocation();
  const { user, isLoading, logout, isAdmin, isTherapist } = useAuth();
  const { frontendLogoUrl } = useBranding();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const cartItems = useCartItems();
  const cartItemCount = getCartItemCount(cartItems);
  const { settings: directorySettings } = useDirectorySettings();
  const directoryExperience = getDirectoryExperienceMode(directorySettings);
  const directoryPrimaryPlural =
    directoryExperience === "store_locator"
      ? directorySettings.listingLabelPlural || directorySettings.directoryLabelPlural
      : directorySettings.participantLabelPlural || directorySettings.listingLabelPlural;
  const directoryNavLabel = `Find ${directoryPrimaryPlural || "Listings"}`;
  const dashboardLabel =
    directoryExperience === "service_provider" ? "Professional Dashboard" : "Listing Dashboard";
  const defaultNavLinks = [
    { label: "About", href: "/about" },
    { label: directoryNavLabel, href: "/directory" },
    { label: "Join the Network", href: "/join" },
  ];

  useEffect(() => {
    const openMiniCart = () => setCartOpen(true);
    window.addEventListener("ecommerce-cart-item-added", openMiniCart);
    return () => window.removeEventListener("ecommerce-cart-item-added", openMiniCart);
  }, []);

  const { data: siteFeaturesData } = useQuery<SiteFeatures>({
    queryKey: ["/api/site-config"],
    staleTime: STALE_TIMES.LIVE,
  });
  const siteFeatures = siteFeaturesData ?? DEFAULT_SITE_FEATURES;

  const { data: publicMenus } = useQuery<Partial<Record<PublicMenuLocation, CmsMenu>>>({
    queryKey: ["/api/cms/menus"],
    queryFn: async () => {
      const res = await fetch("/api/cms/menus");
      if (!res.ok) return null;
      return res.json();
    },
    enabled: siteFeatures.cmsEnabled,
    staleTime: STALE_TIMES.LIVE,
  });

  const dynamicItems = useMemo(() => {
    const headerMenu = publicMenus?.main_navigation ?? publicMenus?.header;
    if (!headerMenu?.items) return null;
    const items = headerMenu.items as MenuItem[];
    return items.length > 0 ? items : null;
  }, [publicMenus]);

  const isClient = user && user.role === "client";
  const hasCustomerAccountAccess = Boolean(
    siteFeatures.ecommerceEnabled &&
    user &&
    (user.role === "client" || user.role === "admin" || user.role === "editor"),
  );
  const resourceLinks = allResourceLinks.filter((link) => !(link.hideFromClients && isClient));

  const unreadNotifCount = useUnreadNotificationCount();
  const brandLogo = frontendLogoUrl || logoImg;

  return (
    <nav
      className="sticky top-0 z-[999] bg-background/95 backdrop-blur-sm border-b"
      data-testid="navbar"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6 px-4 sm:px-6 py-3 sm:py-4">
        <Link href="/" data-testid="link-brand">
          <img src={brandLogo} alt="Core Platform" className="h-8 sm:h-10 w-auto" />
        </Link>

        <div className="hidden md:flex items-center gap-2 flex-wrap">
          {dynamicItems ? (
            dynamicItems.map((item) =>
              item.children && item.children.length > 0 ? (
                <DynamicDropdown key={item.id} item={item} location={location} />
              ) : (
                <DynamicMenuButton key={item.id} item={item} location={location} />
              ),
            )
          ) : (
            <>
              {defaultNavLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant="ghost"
                    className={location === link.href ? "toggle-elevate toggle-elevated" : ""}
                    data-testid={`link-nav-${link.label.toLowerCase()}`}
                    aria-current={location === link.href ? "page" : undefined}
                  >
                    {link.label}
                  </Button>
                </Link>
              ))}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className={
                      resourceLinks.some((r) => location === r.href)
                        ? "toggle-elevate toggle-elevated"
                        : ""
                    }
                    data-testid="link-nav-resources"
                  >
                    Resources
                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="z-[1000]">
                  {resourceLinks.map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link
                        href={link.href}
                        data-testid={`link-nav-resource-${link.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                      >
                        {link.label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Link href="/contact">
                <Button
                  variant="ghost"
                  className={location === "/contact" ? "toggle-elevate toggle-elevated" : ""}
                  data-testid="link-nav-contact"
                  aria-current={location === "/contact" ? "page" : undefined}
                >
                  Contact
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="hidden md:flex items-center gap-3 flex-wrap">
          <NavbarSearchPopover />
          {siteFeatures.ecommerceEnabled ? (
            <CartNavButton cartItemCount={cartItemCount} onClick={() => setCartOpen(true)} />
          ) : null}
          {isLoading ? null : user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="relative h-8 w-8 rounded-full border border-border bg-background flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-ring hover:ring-offset-1 transition-shadow"
                    data-testid="button-user-menu"
                  >
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                    {unreadNotifCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-accent text-accent-foreground text-[10px] font-bold rounded-full h-4 min-w-4 flex items-center justify-center px-1 leading-none">
                        {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                      </span>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[1000]">
                  {isTherapist && (
                    <DropdownMenuItem asChild>
                      <Link href="/therapist" data-testid="link-therapist-dashboard">
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        {dashboardLabel}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" data-testid="link-admin-dashboard">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {hasCustomerAccountAccess && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/account" data-testid="link-customer-account">
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          My Account
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/account/orders" data-testid="link-customer-orders">
                          <ShoppingBag className="mr-2 h-4 w-4" />
                          Orders
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setNotifOpen(true)}
                    data-testid="button-notifications-menu"
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                    {unreadNotifCount > 0 && (
                      <span className="ml-auto bg-accent text-accent-foreground text-xs font-semibold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                        {unreadNotifCount}
                      </span>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => (isClient ? undefined : setProfileOpen(true))}
                    data-testid="button-my-profile"
                    asChild={Boolean(isClient)}
                  >
                    {isClient ? (
                      <Link href="/account/profile">
                        <UserCog className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    ) : (
                      <>
                        <UserCog className="mr-2 h-4 w-4" />
                        My Profile
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout.mutate()} data-testid="button-logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/admin/login">
                <Button variant="ghost" data-testid="link-login">
                  Login
                </Button>
              </Link>
            </>
          )}
        </div>

        <div className="flex md:hidden items-center gap-2">
          {siteFeatures.ecommerceEnabled ? (
            <CartNavButton
              cartItemCount={cartItemCount}
              compact
              onClick={() => setCartOpen(true)}
            />
          ) : null}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>
                  <img src={brandLogo} alt="Core Platform" className="h-8 w-auto" />
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 mt-6">
                {dynamicItems ? (
                  flattenItems(dynamicItems).map(({ item, depth }) =>
                    item.children && item.children.length > 0 ? (
                      <p
                        key={item.id}
                        className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                        style={depth > 0 ? { paddingLeft: `${16 + depth * 16}px` } : undefined}
                        data-testid={`text-mobile-group-${item.id}`}
                      >
                        {item.label}
                      </p>
                    ) : item.openInNewTab ? (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMobileOpen(false)}
                      >
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          style={depth > 0 ? { paddingLeft: `${16 + depth * 16}px` } : undefined}
                          data-testid={`link-mobile-${item.id}`}
                        >
                          {item.label}
                        </Button>
                      </a>
                    ) : (
                      <Link key={item.id} href={item.url} onClick={() => setMobileOpen(false)}>
                        <Button
                          variant="ghost"
                          className={`w-full justify-start ${location === item.url ? "toggle-elevate toggle-elevated" : ""}`}
                          style={depth > 0 ? { paddingLeft: `${16 + depth * 16}px` } : undefined}
                          data-testid={`link-mobile-${item.id}`}
                          aria-current={location === item.url ? "page" : undefined}
                        >
                          {item.label}
                        </Button>
                      </Link>
                    ),
                  )
                ) : (
                  <>
                    {defaultNavLinks.map((link) => (
                      <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                        <Button
                          variant="ghost"
                          className={`w-full justify-start ${location === link.href ? "toggle-elevate toggle-elevated" : ""}`}
                          data-testid={`link-mobile-${link.label.toLowerCase()}`}
                          aria-current={location === link.href ? "page" : undefined}
                        >
                          {link.label}
                        </Button>
                      </Link>
                    ))}
                    <p className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Resources
                    </p>
                    {resourceLinks.map((link) => (
                      <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)}>
                        <Button
                          variant="ghost"
                          className={`w-full justify-start pl-6 ${location === link.href ? "toggle-elevate toggle-elevated" : ""}`}
                          data-testid={`link-mobile-resource-${link.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                          aria-current={location === link.href ? "page" : undefined}
                        >
                          {link.label}
                        </Button>
                      </Link>
                    ))}
                    <Link href="/contact" onClick={() => setMobileOpen(false)}>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start ${location === "/contact" ? "toggle-elevate toggle-elevated" : ""}`}
                        data-testid="link-mobile-contact"
                        aria-current={location === "/contact" ? "page" : undefined}
                      >
                        Contact
                      </Button>
                    </Link>
                  </>
                )}

                <div className="my-3 border-t" />

                {siteFeatures.ecommerceEnabled ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className={`w-full justify-start ${location === "/cart" ? "toggle-elevate toggle-elevated" : ""}`}
                    data-testid="button-mobile-cart"
                    aria-current={location === "/cart" ? "page" : undefined}
                    onClick={() => {
                      setCartOpen(true);
                      setMobileOpen(false);
                    }}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Cart
                    {cartItemCount > 0 ? (
                      <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                        {cartItemCount}
                      </span>
                    ) : null}
                  </Button>
                ) : null}

                {isLoading ? null : user ? (
                  <>
                    <p className="px-4 py-2 text-sm text-muted-foreground">
                      Signed in as {user.firstName} {user.lastName}
                    </p>
                    {isTherapist && (
                      <Link href="/therapist" onClick={() => setMobileOpen(false)}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          data-testid="link-mobile-therapist"
                        >
                          <LayoutDashboard className="mr-2 h-4 w-4" />
                          {dashboardLabel}
                        </Button>
                      </Link>
                    )}
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setMobileOpen(false)}>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          data-testid="link-mobile-admin"
                        >
                          <Shield className="mr-2 h-4 w-4" />
                          Admin Dashboard
                        </Button>
                      </Link>
                    )}
                    {hasCustomerAccountAccess && (
                      <>
                        <Link href="/account" onClick={() => setMobileOpen(false)}>
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            data-testid="link-mobile-customer-account"
                          >
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            My Account
                          </Button>
                        </Link>
                        <Link href="/account/orders" onClick={() => setMobileOpen(false)}>
                          <Button
                            variant="ghost"
                            className="w-full justify-start"
                            data-testid="link-mobile-customer-orders"
                          >
                            <ShoppingBag className="mr-2 h-4 w-4" />
                            Orders
                          </Button>
                        </Link>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        setNotifOpen(true);
                        setMobileOpen(false);
                      }}
                      data-testid="button-mobile-notifications"
                    >
                      <Bell className="mr-2 h-4 w-4" />
                      Notifications
                      {unreadNotifCount > 0 && (
                        <span className="ml-auto bg-accent text-accent-foreground text-xs font-semibold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                          {unreadNotifCount}
                        </span>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        if (isClient) {
                          setMobileOpen(false);
                          return;
                        }
                        setProfileOpen(true);
                        setMobileOpen(false);
                      }}
                      data-testid="button-mobile-profile"
                      asChild={Boolean(isClient)}
                    >
                      {isClient ? (
                        <Link href="/account/profile">
                          <UserCog className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                      ) : (
                        <>
                          <UserCog className="mr-2 h-4 w-4" />
                          My Profile
                        </>
                      )}
                    </Button>
                    <div className="my-1 border-t" />
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        logout.mutate();
                        setMobileOpen(false);
                      }}
                      data-testid="button-mobile-logout"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/admin/login" onClick={() => setMobileOpen(false)}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        data-testid="link-mobile-login"
                      >
                        Login
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {user && (
        <NotificationBell open={notifOpen} onOpenChange={setNotifOpen} showTrigger={false} />
      )}
      <UserProfileDialog open={profileOpen} onOpenChange={setProfileOpen} />
      {siteFeatures.ecommerceEnabled ? (
        <MiniCartDrawer open={cartOpen} onOpenChange={setCartOpen} items={cartItems} />
      ) : null}
    </nav>
  );
}
