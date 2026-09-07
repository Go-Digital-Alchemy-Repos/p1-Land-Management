import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation } from "wouter";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import type { User } from "@shared/schema";
import type { AdminPermission } from "@shared/types";

export type FrontendEditTargetKind =
  | "cms-page"
  | "blog-post"
  | "event"
  | "career-job"
  | "directory-listing"
  | "product";

export interface FrontendEditTarget {
  id: string;
  kind: FrontendEditTargetKind;
  label: string;
}

type FrontendEditRequirement = AdminPermission | "admin";

interface RegisteredFrontendEditTarget extends FrontendEditTarget {
  key: string;
}

interface FrontendEditContextValue {
  registerTarget: (target: FrontendEditTarget) => () => void;
}

const FrontendEditContext = createContext<FrontendEditContextValue | null>(null);

const FRONTEND_EDIT_REQUIREMENTS: Record<FrontendEditTargetKind, FrontendEditRequirement> = {
  "cms-page": "content",
  "blog-post": "content",
  event: "content",
  "career-job": "content",
  "directory-listing": "directory",
  product: "admin",
};

const HIDDEN_PATH_PREFIXES = [
  "/admin",
  "/auth",
  "/setup",
  "/account",
  "/cart",
  "/checkout",
  "/order-success",
  "/orders",
  "/forms",
  "/reference",
  "/therapist",
];

function getTargetKey(target: FrontendEditTarget) {
  return `${target.kind}:${target.id}`;
}

function appendParams(path: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `${path}?${searchParams.toString()}`;
}

export function buildFrontendEditHref(target: FrontendEditTarget, returnTo: string) {
  switch (target.kind) {
    case "cms-page":
      return appendParams(`/admin/cms/pages/${target.id}`, { returnTo });
    case "blog-post":
      return appendParams(`/admin/cms/blog/${target.id}`, { returnTo });
    case "event":
      return appendParams("/admin/events", { edit: target.id, returnTo });
    case "career-job":
      return appendParams("/admin/careers", { tab: "jobs", edit: target.id, returnTo });
    case "directory-listing":
      return appendParams("/admin/therapists", { edit: target.id, returnTo });
    case "product":
      return appendParams("/admin/ecommerce/products", { edit: target.id, returnTo });
  }
}

export function shouldHideFrontendEditButton(pathname: string) {
  return HIDDEN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function canUseFrontendEditTarget(
  user: User | null,
  adminPermissions: AdminPermission[],
  target: FrontendEditTarget,
) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role !== "editor") return false;

  const requirement = FRONTEND_EDIT_REQUIREMENTS[target.kind];
  if (requirement === "admin") return false;
  return adminPermissions.includes(requirement);
}

export function FrontendEditProvider({ children }: { children: ReactNode }) {
  const [targets, setTargets] = useState<Map<string, RegisteredFrontendEditTarget>>(new Map());

  const value = useMemo<FrontendEditContextValue>(
    () => ({
      registerTarget: (target) => {
        const key = getTargetKey(target);
        setTargets((current) => {
          const next = new Map(current);
          next.set(key, { ...target, key });
          return next;
        });
        return () => {
          setTargets((current) => {
            const next = new Map(current);
            next.delete(key);
            return next;
          });
        };
      },
    }),
    [],
  );

  return (
    <FrontendEditContext.Provider value={value}>
      {children}
      <FrontendEditButton targets={Array.from(targets.values())} />
    </FrontendEditContext.Provider>
  );
}

export function useFrontendEditTarget(target: FrontendEditTarget | null | undefined) {
  const context = useContext(FrontendEditContext);
  const targetKey = target ? getTargetKey(target) : "";
  const label = target?.label ?? "";

  useEffect(() => {
    if (!context || !target) return undefined;
    return context.registerTarget(target);
  }, [context, targetKey, label]);
}

export function getFrontendEditQueryParam(name: string, search = window.location.search) {
  return new URLSearchParams(search).get(name);
}

export function useAdminEditDeepLink<T>(
  items: T[] | null | undefined,
  getItemId: (item: T) => string,
  openItem: (item: T) => void,
) {
  const openedEditIdRef = useRef<string | null>(null);

  useEffect(() => {
    const editId = getFrontendEditQueryParam("edit");
    if (!editId || openedEditIdRef.current === editId) return;

    const item = items?.find((candidate) => getItemId(candidate) === editId);
    if (!item) return;

    openedEditIdRef.current = editId;
    openItem(item);
  }, [items, getItemId, openItem]);
}

function getReturnTo() {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function FrontendEditButton({ targets }: { targets: RegisteredFrontendEditTarget[] }) {
  const [location] = useLocation();
  const { user, isLoading, adminPermissions } = useAuth();
  const pathname = location.split(/[?#]/)[0] || "/";

  if (isLoading || shouldHideFrontendEditButton(pathname)) return null;

  const visibleTargets = targets
    .filter((target) => canUseFrontendEditTarget(user, adminPermissions, target))
    .sort((a, b) => a.label.localeCompare(b.label));

  if (visibleTargets.length === 0) return null;

  const returnTo = getReturnTo();
  const primaryTarget = visibleTargets[0];
  const actionLabel = primaryTarget.kind === "cms-page" ? "Edit Page" : "Edit Content";
  const bannerText =
    primaryTarget.kind === "cms-page"
      ? "You are viewing a CMS-managed page."
      : "You are viewing editable site content.";
  const buttonClassName =
    "h-9 border-primary/70 bg-primary px-4 text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
  const bannerClassName =
    "fixed inset-x-0 bottom-0 z-[1100] border-t border-border/70 bg-background/95 px-4 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur supports-[backdrop-filter]:bg-background/90";
  const bannerInnerClassName =
    "mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between";
  const bannerCopy = (
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">Admin editing shortcut</p>
      <p className="truncate text-xs text-muted-foreground">{bannerText}</p>
    </div>
  );

  if (visibleTargets.length === 1) {
    const target = primaryTarget;
    return (
      <div className={bannerClassName} data-testid="frontend-edit-banner">
        <div className={bannerInnerClassName}>
          {bannerCopy}
          <Link href={buildFrontendEditHref(target, returnTo)}>
            <Button
              type="button"
              variant="outline"
              className={buttonClassName}
              aria-label={actionLabel}
              data-testid="button-frontend-edit"
            >
              <Pencil className="mr-2 h-4 w-4" />
              {actionLabel}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={bannerClassName} data-testid="frontend-edit-banner">
      <div className={bannerInnerClassName}>
        {bannerCopy}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={buttonClassName}
              aria-label={actionLabel}
              data-testid="button-frontend-edit"
            >
              <Pencil className="mr-2 h-4 w-4" />
              {actionLabel}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="z-[1200] w-56">
            {visibleTargets.map((target) => (
              <DropdownMenuItem key={target.key} asChild>
                <Link href={buildFrontendEditHref(target, returnTo)}>{target.label}</Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
